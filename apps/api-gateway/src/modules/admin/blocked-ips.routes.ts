// =============================================================================
// Blocked IPs — admin endpoints
//
//  GET    /admin/blocked-ips              — list all currently blocked IPs
//  POST   /admin/blocked-ips/:ip/block    — manually block an IP
//  DELETE /admin/blocked-ips/:ip/unblock  — manually unblock an IP
//  GET    /admin/blocked-ips/:ip/history  — failure counter + block status for an IP
//
// All routes require "admin" or "super_admin" role.
// Depends on Redis — returns 503 when Redis is unavailable.
// =============================================================================

import { failure, success } from "@repo/common/schemas";
import { Hono } from "hono";
import { getRedis } from "@/config";
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

// ── GET /admin/blocked-ips — list all blocked IPs ────────────────────────────
app.get(
  "/admin/blocked-ips",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (c) => {
    const redis = getRedis();
    if (!redis) {
      return c.json(failure("SERVICE_UNAVAILABLE", "Redis not available"), 503);
    }

    // SCAN for all block keys (safe for large keyspaces)
    const blocked: Array<{ ip: string } & BlockEntry> = [];
    let cursor = "0";

    do {
      const [next, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${BLOCK_KEY_PREFIX}*`,
        "COUNT",
        200
      );
      cursor = next;

      if (keys.length > 0) {
        const values = await redis.mget(...keys);
        for (let i = 0; i < keys.length; i++) {
          const ip = keys[i]!.slice(BLOCK_KEY_PREFIX.length);
          const raw = values[i];
          if (!raw) {
            continue;
          }

          try {
            const entry = JSON.parse(raw) as BlockEntry;
            blocked.push({ ip, ...entry });
          } catch {
            blocked.push({
              ip,
              reason: "Unknown",
              blockedAt: "",
              until: "",
              autoBlock: false,
            });
          }
        }
      }
    } while (cursor !== "0");

    // Sort by most recently blocked first
    blocked.sort((a, b) => (b.blockedAt > a.blockedAt ? 1 : -1));

    return c.json(
      success({
        count: blocked.length,
        config: {
          threshold: IP_BLOCK_THRESHOLD,
          windowSeconds: IP_BLOCK_WINDOW_SECONDS,
          durationSeconds: IP_BLOCK_DURATION_SECONDS,
        },
        blocked,
      })
    );
  }
);

// ── GET /admin/blocked-ips/:ip/history — status for a specific IP ─────────────
app.get(
  "/admin/blocked-ips/:ip/history",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (c) => {
    const redis = getRedis();
    if (!redis) {
      return c.json(failure("SERVICE_UNAVAILABLE", "Redis not available"), 503);
    }

    const ip = c.req.param("ip");

    const [blockRaw, failCount, failTtl] = await Promise.all([
      redis.get(`${BLOCK_KEY_PREFIX}${ip}`),
      redis.get(`${FAIL_KEY_PREFIX}${ip}`),
      redis.ttl(`${FAIL_KEY_PREFIX}${ip}`),
    ]);

    let blockEntry: BlockEntry | null = null;
    if (blockRaw) {
      try {
        blockEntry = JSON.parse(blockRaw) as BlockEntry;
      } catch {
        /* ignore */
      }
    }

    return c.json(
      success({
        ip,
        isBlocked: blockEntry !== null,
        blockEntry,
        failureCount: failCount ? Number.parseInt(failCount, 10) : 0,
        failureWindowRemainingSeconds: failTtl > 0 ? failTtl : 0,
        threshold: IP_BLOCK_THRESHOLD,
      })
    );
  }
);

// ── POST /admin/blocked-ips/:ip/block — manually block an IP ─────────────────
app.post(
  "/admin/blocked-ips/:ip/block",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (c) => {
    const redis = getRedis();
    if (!redis) {
      return c.json(failure("SERVICE_UNAVAILABLE", "Redis not available"), 503);
    }

    const ip = c.req.param("ip");

    let durationSeconds = IP_BLOCK_DURATION_SECONDS;
    let reason = "Manually blocked by admin";

    try {
      const body = (await c.req.json()) as {
        durationSeconds?: number;
        reason?: string;
      };
      if (body.durationSeconds) {
        durationSeconds = Math.max(60, body.durationSeconds);
      }
      if (body.reason) {
        reason = body.reason;
      }
    } catch {
      /* body is optional */
    }

    const now = new Date();
    const until = new Date(now.getTime() + durationSeconds * 1000);

    const entry: BlockEntry = {
      reason,
      blockedAt: now.toISOString(),
      until: until.toISOString(),
      autoBlock: false,
    };

    const admin = c.var.user;

    await redis.set(
      `${BLOCK_KEY_PREFIX}${ip}`,
      JSON.stringify(entry),
      "EX",
      durationSeconds
    );

    console.warn(
      `[ip-blocklist] MANUAL BLOCK ${ip} by ${admin?.email ?? "admin"} until ${until.toISOString()}`
    );

    return c.json(success({ ip, ...entry }), 201);
  }
);

// ── DELETE /admin/blocked-ips/:ip/unblock — remove a block ───────────────────
app.delete(
  "/admin/blocked-ips/:ip/unblock",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (c) => {
    const redis = getRedis();
    if (!redis) {
      return c.json(failure("SERVICE_UNAVAILABLE", "Redis not available"), 503);
    }

    const ip = c.req.param("ip");
    const admin = c.var.user;

    const [delBlock, delFail] = await Promise.all([
      redis.del(`${BLOCK_KEY_PREFIX}${ip}`),
      redis.del(`${FAIL_KEY_PREFIX}${ip}`),
    ]);

    if (delBlock === 0) {
      return c.json(
        failure("NOT_FOUND", `IP ${ip} is not currently blocked`),
        404
      );
    }

    console.info(
      `[ip-blocklist] UNBLOCKED ${ip} by ${admin?.email ?? "admin"}`
    );

    return c.json(
      success({
        ip,
        unblocked: true,
        failureCounterReset: delFail > 0,
      })
    );
  }
);

export { app as blockedIpsRoutes };
