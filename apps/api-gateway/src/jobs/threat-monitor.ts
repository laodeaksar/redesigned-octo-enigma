// =============================================================================
// Threat monitor — background interval job
//
// Polls the audit log DB every ALERT_MONITOR_INTERVAL_SECONDS to evaluate the
// current threat level. When the level escalates (and meets the configured
// threshold), fires an alert via webhook and/or email.
//
// Lifecycle:
//   startThreatMonitor()  — call once at startup (after Redis + DB are ready)
//   stopThreatMonitor()   — call on graceful shutdown
// =============================================================================

import { auditLogsTable } from "@repo/database/drizzle/schema";
import { count, gte } from "drizzle-orm";
import { db, env, getRedis } from "@/config";
import {
  getCooldownTtl,
  isEscalation,
  meetsThreshold,
  sendAlert,
  type ThreatLevel,
  updateTrackedLevel,
} from "@/lib/alerting";
import { BLOCK_KEY_PREFIX } from "@/middleware/ip-blocklist.middleware";

// ── Threat level derivation ───────────────────────────────────────────────────

function deriveLevel(failuresLastHour: number): ThreatLevel {
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

// ── Current state ─────────────────────────────────────────────────────────────

let _timer: ReturnType<typeof setInterval> | null = null;
let _currentLevel: ThreatLevel = "LOW";
let _lastPollAt: Date | null = null;
let _lastError: string | null = null;
let _pollCount = 0;

export function getCurrentLevel(): ThreatLevel {
  return _currentLevel;
}
export function getLastPollAt(): Date | null {
  return _lastPollAt;
}
export function getLastError(): string | null {
  return _lastError;
}
export function getPollCount(): number {
  return _pollCount;
}

// ── Poll ──────────────────────────────────────────────────────────────────────

async function poll(): Promise<void> {
  _pollCount++;
  _lastError = null;

  try {
    // ── 1. Count failures in the last hour ──────────────────────────────────
    let failuresLastHour = 0;

    if (db) {
      const h1 = new Date(Date.now() - 3_600_000);
      const [{ n }] = await db
        .select({ n: count() })
        .from(auditLogsTable)
        .where(gte(auditLogsTable.createdAt, h1));
      failuresLastHour = Number(n);
    }

    // ── 2. Count active IP blocks ───────────────────────────────────────────
    let activeBlocks = 0;
    const redis = getRedis();
    if (redis) {
      const keys = await redis
        .keys(`${BLOCK_KEY_PREFIX}*`)
        .catch(() => [] as string[]);
      activeBlocks = keys.length;
    }

    // ── 3. Derive current threat level ─────────────────────────────────────
    const current = deriveLevel(failuresLastHour);
    _currentLevel = current;
    _lastPollAt = new Date();

    // ── 4. Compare with tracked previous level ──────────────────────────────
    const { previous, changed } = await updateTrackedLevel(current);

    if (!changed) {
      return; // No level change — nothing to do
    }

    const escalated = isEscalation(previous, current);
    const meetsMin = meetsThreshold(
      current,
      env.ALERT_THRESHOLD_LEVEL as ThreatLevel
    );

    if (!(escalated && meetsMin)) {
      return; // Downgrade or below threshold — skip alert
    }

    // ── 5. Check cooldown before alerting ───────────────────────────────────
    const ttl = await getCooldownTtl(current);
    if (ttl > 0) {
      console.info(
        `[threat-monitor] Level ${previous}→${current} — cooldown active (${ttl}s remaining), skip alert`
      );
      return;
    }

    // ── 6. Fire alert ───────────────────────────────────────────────────────
    console.warn(
      `[threat-monitor] 🚨 Threat escalation: ${previous} → ${current} (${failuresLastHour} failures/hr)`
    );

    const result = await sendAlert({
      level: current,
      previousLevel: previous,
      failuresLastHour,
      activeBlocks,
      environment: env.ALERT_ENV_NAME,
      gatewayUrl: `http://localhost:${env.PORT}`,
    });

    console.info("[threat-monitor] Alert result:", result);
  } catch (err) {
    _lastError = err instanceof Error ? err.message : String(err);
    console.warn("[threat-monitor] Poll error:", _lastError);
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

export function startThreatMonitor(): void {
  if (_timer) {
    return; // Already running
  }

  const intervalMs = env.ALERT_MONITOR_INTERVAL_SECONDS * 1000;

  // Run once immediately, then on interval
  void poll();
  _timer = setInterval(() => void poll(), intervalMs);

  // Don't let the interval keep the process alive by itself
  if (typeof _timer.unref === "function") {
    _timer.unref();
  }

  console.info(
    `[threat-monitor] Started — polling every ${env.ALERT_MONITOR_INTERVAL_SECONDS}s, ` +
      `threshold: ${env.ALERT_THRESHOLD_LEVEL}, ` +
      `cooldown: ${env.ALERT_COOLDOWN_MINUTES}min`
  );
}

export function stopThreatMonitor(): void {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    console.info("[threat-monitor] Stopped");
  }
}
