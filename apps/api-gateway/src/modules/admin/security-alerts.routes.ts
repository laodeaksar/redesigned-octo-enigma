// =============================================================================
// Security Alerts — admin endpoints
//
//  GET  /admin/security/alerts/status  — current monitor state + last alert sent
//  POST /admin/security/alerts/test    — trigger a test alert immediately
//  POST /admin/security/alerts/reset   — clear cooldown so next escalation re-alerts
// =============================================================================

import { env, getRedis } from "@/config";
import {
  getCurrentLevel,
  getLastError,
  getLastPollAt,
  getPollCount,
} from "@/jobs/threat-monitor";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { Hono } from "hono";

import { failure, success } from "@repo/common/schemas";

import {
  getCooldownTtl,
  getLastSentAlert,
  sendAlert,
  type ThreatLevel,
} from "@/lib/alerting";

const LEVELS: ThreatLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const COOLDOWN_KEY_PREFIX = "security:alert:cooldown:";

const app = new Hono();

// ── GET /admin/security/alerts/status ────────────────────────────────────────
app.get(
  "/admin/security/alerts/status",
  requireAuth,
  requireRole("admin", "super_admin"),
  async c => {
    const [lastSent, ...cooldownTtls] = await Promise.all([
      getLastSentAlert(),
      ...LEVELS.map(l => getCooldownTtl(l)),
    ]);

    const cooldowns = Object.fromEntries(
      LEVELS.map((l, i) => [l, cooldownTtls[i]!])
    );

    return c.json(
      success({
        monitor: {
          running: true,
          currentLevel: getCurrentLevel(),
          pollCount: getPollCount(),
          lastPollAt: getLastPollAt()?.toISOString() ?? null,
          lastError: getLastError(),
          intervalSeconds: env.ALERT_MONITOR_INTERVAL_SECONDS,
        },
        config: {
          webhookConfigured: Boolean(env.ALERT_WEBHOOK_URL),
          emailConfigured: Boolean(env.ALERT_EMAIL_TO),
          emailRecipients: env.ALERT_EMAIL_TO
            ? env.ALERT_EMAIL_TO.split(",").map(s => s.trim())
            : [],
          thresholdLevel: env.ALERT_THRESHOLD_LEVEL,
          cooldownMinutes: env.ALERT_COOLDOWN_MINUTES,
          environment: env.ALERT_ENV_NAME,
        },
        cooldowns, // remaining seconds per level, 0 = no cooldown
        lastSent,
      })
    );
  }
);

// ── POST /admin/security/alerts/test ─────────────────────────────────────────
app.post(
  "/admin/security/alerts/test",
  requireAuth,
  requireRole("admin", "super_admin"),
  async c => {
    if (!(env.ALERT_WEBHOOK_URL || env.ALERT_EMAIL_TO)) {
      return c.json(
        failure(
          "NOT_CONFIGURED",
          "No alert channels configured. Set ALERT_WEBHOOK_URL or ALERT_EMAIL_TO."
        ),
        422
      );
    }

    let testLevel: ThreatLevel = "HIGH";
    try {
      const body = (await c.req.json()) as { level?: ThreatLevel };
      if (body?.level && LEVELS.includes(body.level)) {
        testLevel = body.level;
      }
    } catch {
      /* body is optional */
    }

    // Bypass cooldown for test — use a separate test cooldown key
    const redis = getRedis();
    if (redis) {
      await redis.del(`${COOLDOWN_KEY_PREFIX}${testLevel}`).catch(() => {});
    }

    const result = await sendAlert({
      level: testLevel,
      previousLevel: "LOW",
      failuresLastHour: 0,
      activeBlocks: 0,
      environment: `${env.ALERT_ENV_NAME} (TEST)`,
      gatewayUrl: `http://localhost:${env.PORT}`,
    });

    return c.json(
      success({
        testLevel,
        result,
        note: "This was a test alert — cooldown was bypassed.",
      })
    );
  }
);

// ── POST /admin/security/alerts/reset-cooldown ───────────────────────────────
app.post(
  "/admin/security/alerts/reset-cooldown",
  requireAuth,
  requireRole("admin", "super_admin"),
  async c => {
    const redis = getRedis();
    if (!redis) {
      return c.json(failure("SERVICE_UNAVAILABLE", "Redis not available"), 503);
    }

    let levels = LEVELS;
    try {
      const body = (await c.req.json()) as { level?: ThreatLevel };
      if (body?.level && LEVELS.includes(body.level)) {
        levels = [body.level];
      }
    } catch {
      /* reset all */
    }

    const deleted = await Promise.all(
      levels.map(l => redis.del(`${COOLDOWN_KEY_PREFIX}${l}`).catch(() => 0))
    );

    return c.json(
      success({
        reset: levels.filter((_, i) => deleted[i] === 1),
        alreadyClear: levels.filter((_, i) => deleted[i] === 0),
      })
    );
  }
);

export { app as securityAlertsRoutes };
