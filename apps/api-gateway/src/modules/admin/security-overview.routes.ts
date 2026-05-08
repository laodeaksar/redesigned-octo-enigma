// =============================================================================
// Security Overview — single aggregated endpoint for the admin security panel
//
//  GET /admin/security/overview
//
// Returns in one call:
//  • threat level  — derived from recent failure rate
//  • audit summary — failure counts for 1h / 24h / 7d windows
//  • top offenders — IPs and paths generating the most failures
//  • recent events — last 20 failure entries
//  • hourly trend  — per-hour counts for the last 24 h
//  • blocklist     — currently blocked IPs + IPs nearing threshold
//  • system status — DB + Redis availability, uptime
//
// All data is fetched concurrently; partial failures degrade gracefully.
// Requires "admin" or "super_admin" role.
// =============================================================================

import { success } from "@repo/common/schemas";
import { auditLogsTable } from "@repo/database/drizzle/schema";
import { and, count, desc, gte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db, getRedis } from "@/config";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import {
  BLOCK_KEY_PREFIX,
  type BlockEntry,
  FAIL_KEY_PREFIX,
  IP_BLOCK_DURATION_SECONDS,
  IP_BLOCK_THRESHOLD,
  IP_BLOCK_WINDOW_SECONDS,
} from "@/middleware/ip-blocklist.middleware";

const app = new Hono();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fetch all keys matching a pattern via cursor-based SCAN (Redis safe). */
async function redisScan(pattern: string): Promise<string[]> {
  const redis = getRedis();
  if (!redis) {
    return [];
  }
  const keys: string[] = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      200
    );
    cursor = next;
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
}

/**
 * Derive a human-readable threat level from failures in the last hour.
 *   0–4   → LOW
 *   5–19  → MEDIUM
 *   20–99 → HIGH
 *   100+  → CRITICAL
 */
function threatLevel(
  failuresLastHour: number
): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (failuresLastHour >= 100) {
    return "CRITICAL";
  }
  if (failuresLastHour >= 20) {
    return "HIGH";
  }
  if (failuresLastHour >= 5) {
    return "MEDIUM";
  }
  return "LOW";
}

// ── GET /admin/security/overview ──────────────────────────────────────────────
app.get(
  "/admin/security/overview",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (c) => {
    const now = Date.now();
    const h1 = new Date(now - 1 * 3_600_000);
    const h24 = new Date(now - 24 * 3_600_000);
    const d7 = new Date(now - 7 * 86_400_000);

    // ── Run all data sources concurrently ─────────────────────────────────────
    const [auditData, redisData] = await Promise.allSettled([
      fetchAuditData(h1, h24, d7),
      fetchRedisData(),
    ]);

    const audit = auditData.status === "fulfilled" ? auditData.value : null;
    const redis = redisData.status === "fulfilled" ? redisData.value : null;

    // ── Threat level ──────────────────────────────────────────────────────────
    const failuresLastHour = audit?.counts.h1 ?? 0;
    const level = threatLevel(failuresLastHour);

    return c.json(
      success({
        generatedAt: new Date(now).toISOString(),
        threatLevel: level,

        // ── Audit summary ───────────────────────────────────────────────────────
        audit: audit
          ? {
              available: true,
              counts: audit.counts,
              byErrorCode: audit.byErrorCode,
              topOffendingIps: audit.topIps,
              topOffendingPaths: audit.topPaths,
              hourlyTrend: audit.hourlyTrend,
              recentEvents: audit.recentEvents,
            }
          : { available: false },

        // ── Blocklist ───────────────────────────────────────────────────────────
        blocklist: redis
          ? {
              available: true,
              activeBlocks: redis.blocked.length,
              blockedIps: redis.blocked,
              approachingThreshold: redis.nearThreshold,
              config: {
                threshold: IP_BLOCK_THRESHOLD,
                windowSeconds: IP_BLOCK_WINDOW_SECONDS,
                durationSeconds: IP_BLOCK_DURATION_SECONDS,
              },
            }
          : { available: false },

        // ── System status ───────────────────────────────────────────────────────
        system: {
          database: db ? "connected" : "unavailable",
          redis: redis ? "connected" : "unavailable",
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
        },
      })
    );
  }
);

// ── Data fetchers (run concurrently, isolated failures) ───────────────────────

async function fetchAuditData(h1: Date, h24: Date, d7: Date) {
  if (!db) {
    throw new Error("DB unavailable");
  }

  const [
    [countH1],
    [countH24],
    [countD7],
    byErrorCode,
    topIps,
    topPaths,
    hourlyTrend,
    recentEvents,
  ] = await Promise.all([
    // Counts per window
    db
      .select({ n: count() })
      .from(auditLogsTable)
      .where(gte(auditLogsTable.createdAt, h1)),
    db
      .select({ n: count() })
      .from(auditLogsTable)
      .where(gte(auditLogsTable.createdAt, h24)),
    db
      .select({ n: count() })
      .from(auditLogsTable)
      .where(gte(auditLogsTable.createdAt, d7)),

    // Breakdown by error code (last 24 h)
    db
      .select({
        errorCode: auditLogsTable.errorCode,
        statusCode: auditLogsTable.statusCode,
        count: count(),
      })
      .from(auditLogsTable)
      .where(gte(auditLogsTable.createdAt, h24))
      .groupBy(auditLogsTable.errorCode, auditLogsTable.statusCode)
      .orderBy(desc(count()))
      .limit(10),

    // Top offending IPs (last 24 h)
    db
      .select({ ip: auditLogsTable.ip, count: count() })
      .from(auditLogsTable)
      .where(
        and(
          gte(auditLogsTable.createdAt, h24),
          sql`${auditLogsTable.ip} IS NOT NULL AND ${auditLogsTable.ip} != 'unknown'`
        )
      )
      .groupBy(auditLogsTable.ip)
      .orderBy(desc(count()))
      .limit(10),

    // Top offending paths (last 24 h)
    db
      .select({ path: auditLogsTable.path, count: count() })
      .from(auditLogsTable)
      .where(gte(auditLogsTable.createdAt, h24))
      .groupBy(auditLogsTable.path)
      .orderBy(desc(count()))
      .limit(10),

    // Per-hour counts (last 24 h)
    db
      .select({
        hour: sql<string>`to_char(date_trunc('hour', ${auditLogsTable.createdAt}), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        count: count(),
      })
      .from(auditLogsTable)
      .where(gte(auditLogsTable.createdAt, h24))
      .groupBy(sql`date_trunc('hour', ${auditLogsTable.createdAt})`)
      .orderBy(sql`date_trunc('hour', ${auditLogsTable.createdAt})`),

    // Most recent failure events
    db
      .select({
        id: auditLogsTable.id,
        createdAt: auditLogsTable.createdAt,
        ip: auditLogsTable.ip,
        method: auditLogsTable.method,
        path: auditLogsTable.path,
        statusCode: auditLogsTable.statusCode,
        errorCode: auditLogsTable.errorCode,
        userEmail: auditLogsTable.userEmail,
        userRole: auditLogsTable.userRole,
      })
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(20),
  ]);

  return {
    counts: {
      h1: Number(countH1!.n),
      h24: Number(countH24!.n),
      d7: Number(countD7!.n),
    },
    byErrorCode,
    topIps,
    topPaths,
    hourlyTrend,
    recentEvents,
  };
}

async function fetchRedisData() {
  const redis = getRedis();
  if (!redis) {
    throw new Error("Redis unavailable");
  }

  const [blockKeys, failKeys] = await Promise.all([
    redisScan(`${BLOCK_KEY_PREFIX}*`),
    redisScan(`${FAIL_KEY_PREFIX}*`),
  ]);

  // Fetch all blocked entries
  const blocked: Array<{ ip: string } & BlockEntry> = [];
  if (blockKeys.length > 0) {
    const values = await redis.mget(...blockKeys);
    for (let i = 0; i < blockKeys.length; i++) {
      const ip = blockKeys[i]!.slice(BLOCK_KEY_PREFIX.length);
      const raw = values[i];
      if (!raw) {
        continue;
      }
      try {
        blocked.push({ ip, ...(JSON.parse(raw) as BlockEntry) });
      } catch {
        /* skip malformed */
      }
    }
  }
  blocked.sort((a, b) => (b.blockedAt > a.blockedAt ? 1 : -1));

  // Fetch IPs nearing the threshold (failure counter > 50% of threshold)
  const nearThreshold: Array<{
    ip: string;
    failures: number;
    threshold: number;
    pct: number;
  }> = [];
  if (failKeys.length > 0) {
    const counts = await redis.mget(...failKeys);
    for (let i = 0; i < failKeys.length; i++) {
      const ip = failKeys[i]!.slice(FAIL_KEY_PREFIX.length);
      const n = Number.parseInt(counts[i] ?? "0", 10);
      const pct = Math.round((n / IP_BLOCK_THRESHOLD) * 100);
      if (pct >= 50) {
        nearThreshold.push({
          ip,
          failures: n,
          threshold: IP_BLOCK_THRESHOLD,
          pct,
        });
      }
    }
    nearThreshold.sort((a, b) => b.failures - a.failures);
  }

  return { blocked, nearThreshold };
}

export { app as securityOverviewRoutes };
