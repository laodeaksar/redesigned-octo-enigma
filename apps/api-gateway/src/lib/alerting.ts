// =============================================================================
// Security alerting — sends webhook + optional email when threat level escalates
//
// Redis keys:
//   security:alert:last_level          — last known threat level (string)
//   security:alert:cooldown:{level}    — set during cooldown window (prevents spam)
//   security:alert:last_sent           — JSON { level, sentAt, channel } of last alert
// =============================================================================

import { env, getRedis } from "@/config";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ThreatLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AlertContext {
  activeBlocks: number;
  environment: string;
  failuresLastHour: number;
  gatewayUrl: string;
  level: ThreatLevel;
  previousLevel: ThreatLevel;
}

export interface AlertResult {
  cooldownActive: boolean;
  email: "sent" | "skipped" | "failed" | "not_configured";
  webhook: "sent" | "skipped" | "failed" | "not_configured";
}

// ── Level ordering (higher = more severe) ────────────────────────────────────

const LEVEL_ORDER: Record<ThreatLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export function isEscalation(from: ThreatLevel, to: ThreatLevel): boolean {
  return LEVEL_ORDER[to] > LEVEL_ORDER[from];
}

export function meetsThreshold(
  level: ThreatLevel,
  threshold: ThreatLevel
): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[threshold];
}

// ── Colour / emoji helpers ────────────────────────────────────────────────────

const LEVEL_META: Record<
  ThreatLevel,
  { emoji: string; color: number; label: string }
> = {
  LOW: { emoji: "🟢", color: 0x2e_cc_71, label: "Low" },
  MEDIUM: { emoji: "🟡", color: 0xf3_9c_12, label: "Medium" },
  HIGH: { emoji: "🔴", color: 0xe7_4c_3c, label: "High" },
  CRITICAL: { emoji: "🚨", color: 0x7b_00_00, label: "Critical" },
};

// ── Webhook payload builders ──────────────────────────────────────────────────

/**
 * Build a single payload that is simultaneously:
 *  • Discord-compatible  (embeds array)
 *  • Slack-compatible    (text + blocks)
 *  • Generic JSON        (alert top-level)
 */
function buildWebhookPayload(ctx: AlertContext) {
  const meta = LEVEL_META[ctx.level];
  const ts = new Date().toISOString();
  const title = `${meta.emoji} Security Alert — Threat Level ${meta.label}`;
  const desc = [
    `**Environment:** ${ctx.environment}`,
    `**Previous Level:** ${ctx.previousLevel} → **${ctx.level}**`,
    `**Failures (last hour):** ${ctx.failuresLastHour}`,
    `**Active IP Blocks:** ${ctx.activeBlocks}`,
    `**Gateway:** ${ctx.gatewayUrl}`,
    `**Time:** ${ts}`,
  ].join("\n");

  return {
    // ── Generic ──────────────────────────────────────────────────────────────
    alert: {
      level: ctx.level,
      previousLevel: ctx.previousLevel,
      environment: ctx.environment,
      failuresLastHour: ctx.failuresLastHour,
      activeBlocks: ctx.activeBlocks,
      gatewayUrl: ctx.gatewayUrl,
      timestamp: ts,
    },

    // ── Discord ───────────────────────────────────────────────────────────────
    username: "Security Monitor",
    embeds: [
      {
        title,
        description: desc.replace(/\*\*/g, "**"),
        color: meta.color,
        timestamp: ts,
        footer: { text: `${ctx.environment} · My Ecommerce Security` },
        fields: [
          {
            name: "Failures / hour",
            value: String(ctx.failuresLastHour),
            inline: true,
          },
          {
            name: "Blocked IPs",
            value: String(ctx.activeBlocks),
            inline: true,
          },
          { name: "Previous Level", value: ctx.previousLevel, inline: true },
        ],
      },
    ],

    // ── Slack ─────────────────────────────────────────────────────────────────
    text: `${meta.emoji} *Security Alert* — Threat level escalated to *${ctx.level}* in \`${ctx.environment}\``,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: title, emoji: true },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Level:*\n${ctx.previousLevel} → *${ctx.level}*`,
          },
          { type: "mrkdwn", text: `*Environment:*\n${ctx.environment}` },
          {
            type: "mrkdwn",
            text: `*Failures (last hour):*\n${ctx.failuresLastHour}`,
          },
          { type: "mrkdwn", text: `*Active IP Blocks:*\n${ctx.activeBlocks}` },
        ],
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `Gateway: ${ctx.gatewayUrl} · ${ts}` },
        ],
      },
    ],
  };
}

// ── Email payload helper ──────────────────────────────────────────────────────

function buildEmailHtml(ctx: AlertContext): string {
  const meta = LEVEL_META[ctx.level];
  const ts = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const bgColor =
    ctx.level === "CRITICAL"
      ? "#7b0000"
      : ctx.level === "HIGH"
        ? "#e74c3c"
        : ctx.level === "MEDIUM"
          ? "#f39c12"
          : "#2ecc71";

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;margin:0;padding:20px;background:#f5f5f5">
<div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:${bgColor};padding:24px 32px;color:#fff">
    <h1 style="margin:0;font-size:22px">${meta.emoji} Security Alert</h1>
    <p style="margin:8px 0 0;opacity:.9">Threat Level Escalated to <strong>${ctx.level}</strong></p>
  </div>
  <div style="padding:32px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#666;width:40%">Environment</td><td style="padding:8px 0;font-weight:600">${ctx.environment}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Level Change</td><td style="padding:8px 0;font-weight:600">${ctx.previousLevel} → ${ctx.level}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Failures (last hour)</td><td style="padding:8px 0;font-weight:600">${ctx.failuresLastHour}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Active IP Blocks</td><td style="padding:8px 0;font-weight:600">${ctx.activeBlocks}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Gateway</td><td style="padding:8px 0"><a href="${ctx.gatewayUrl}">${ctx.gatewayUrl}</a></td></tr>
      <tr><td style="padding:8px 0;color:#666">Timestamp (WIB)</td><td style="padding:8px 0;font-weight:600">${ts}</td></tr>
    </table>
    <p style="margin-top:24px;padding:16px;background:#fff8f0;border-left:4px solid ${bgColor};border-radius:4px;color:#333">
      Log in to the admin dashboard to view the full security overview and manage blocked IPs.
    </p>
  </div>
  <div style="padding:16px 32px;background:#f9f9f9;color:#999;font-size:12px">
    My Ecommerce Security Monitor · ${ctx.environment}
  </div>
</div></body></html>`;
}

// ── Core send functions ───────────────────────────────────────────────────────

async function sendWebhook(
  ctx: AlertContext
): Promise<"sent" | "failed" | "not_configured"> {
  const url = env.ALERT_WEBHOOK_URL;
  if (!url) {
    return "not_configured";
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildWebhookPayload(ctx)),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.warn(
        `[alerting] Webhook responded ${res.status}: ${await res.text().catch(() => "")}`
      );
      return "failed";
    }

    console.info(`[alerting] Webhook sent → ${url} (${res.status})`);
    return "sent";
  } catch (err) {
    console.error("[alerting] Webhook error:", err);
    return "failed";
  }
}

async function sendEmail(
  ctx: AlertContext
): Promise<"sent" | "failed" | "not_configured"> {
  const to = env.ALERT_EMAIL_TO;
  if (!to) {
    return "not_configured";
  }

  const redis = getRedis();
  if (!redis) {
    return "not_configured"; // BullMQ requires Redis
  }

  try {
    const { Queue } = await import("bullmq");
    const { QUEUES } = await import("@repo/common/events");

    type ConnectionOptions = ConstructorParameters<
      typeof Queue
    >[1]["connection"];
    const queue = new Queue(QUEUES.EMAIL_SECURITY_ALERT, {
      connection: redis as unknown as ConnectionOptions,
    });

    const meta = LEVEL_META[ctx.level];
    await queue.add(
      "process",
      {
        to: to.split(",").map((s) => s.trim()),
        subject: `${meta.emoji} [${ctx.environment}] Security Alert — Threat Level ${ctx.level}`,
        html: buildEmailHtml(ctx),
        text: `Security Alert: Threat level escalated to ${ctx.level} in ${ctx.environment}. Failures last hour: ${ctx.failuresLastHour}. Active blocks: ${ctx.activeBlocks}.`,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      }
    );

    await queue.close();
    console.info(`[alerting] Email queued → ${to}`);
    return "sent";
  } catch (err) {
    console.error("[alerting] Email queue error:", err);
    return "failed";
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

const COOLDOWN_KEY_PREFIX = "security:alert:cooldown:";
const LAST_LEVEL_KEY = "security:alert:last_level";
const LAST_SENT_KEY = "security:alert:last_sent";

/**
 * Attempt to send an alert for the given context.
 * Checks cooldown in Redis — will not send more than once per ALERT_COOLDOWN_MINUTES
 * for the same threat level.
 */
export async function sendAlert(ctx: AlertContext): Promise<AlertResult> {
  const redis = getRedis();

  // ── Cooldown check ────────────────────────────────────────────────────────
  const cooldownKey = `${COOLDOWN_KEY_PREFIX}${ctx.level}`;
  const cooldownActive = redis
    ? (await redis.exists(cooldownKey).catch(() => 0)) === 1
    : false;

  if (cooldownActive) {
    return { webhook: "skipped", email: "skipped", cooldownActive: true };
  }

  // ── Send channels concurrently ────────────────────────────────────────────
  const [webhook, email] = await Promise.all([
    sendWebhook(ctx),
    sendEmail(ctx),
  ]);

  const anySent = webhook === "sent" || email === "sent";

  // ── Set cooldown and record last-sent ─────────────────────────────────────
  if (anySent && redis) {
    const cooldownSeconds = env.ALERT_COOLDOWN_MINUTES * 60;
    await redis.set(cooldownKey, "1", "EX", cooldownSeconds).catch(() => {});
    await redis
      .set(
        LAST_SENT_KEY,
        JSON.stringify({
          level: ctx.level,
          sentAt: new Date().toISOString(),
          channels: { webhook, email },
          context: ctx,
        }),
        "EX",
        86_400
      )
      .catch(() => {}); // keep for 24h
  }

  return { webhook, email, cooldownActive: false };
}

/**
 * Read and update the tracked threat level in Redis.
 * Returns `{ previous, current, changed }`.
 */
export async function updateTrackedLevel(
  current: ThreatLevel
): Promise<{ previous: ThreatLevel; changed: boolean }> {
  const redis = getRedis();
  if (!redis) {
    return { previous: "LOW", changed: false };
  }

  const stored = (await redis
    .get(LAST_LEVEL_KEY)
    .catch(() => null)) as ThreatLevel | null;
  const previous: ThreatLevel = stored ?? "LOW";
  const changed = current !== previous;

  if (changed) {
    await redis.set(LAST_LEVEL_KEY, current, "EX", 86_400 * 7).catch(() => {});
  }

  return { previous, changed };
}

/**
 * Read last-sent alert record for status display.
 */
export async function getLastSentAlert(): Promise<Record<
  string,
  unknown
> | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }
  const raw = await redis.get(LAST_SENT_KEY).catch(() => null);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Check if a cooldown is currently active for a level.
 * Returns remaining TTL in seconds, or 0 if no cooldown.
 */
export async function getCooldownTtl(level: ThreatLevel): Promise<number> {
  const redis = getRedis();
  if (!redis) {
    return 0;
  }
  const ttl = await redis.ttl(`${COOLDOWN_KEY_PREFIX}${level}`).catch(() => -1);
  return Math.max(0, ttl);
}
