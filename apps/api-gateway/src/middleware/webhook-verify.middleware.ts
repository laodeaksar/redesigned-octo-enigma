// =============================================================================
// Webhook signature verification + replay-attack protection middleware
//
// Two independent defenses applied at the API Gateway before any request
// reaches a downstream service:
//
//   1. Signature verification
//      Cryptographically proves the payload came from the declared provider.
//      Provider: Midtrans — SHA512(order_id + status_code + gross_amount + key)
//
//   2. Replay / duplicate-delivery protection
//      Stores a processed-notification fingerprint in Redis using SET NX EX
//      (atomic "set if not exists" with TTL).  A second delivery of the same
//      notification is detected and acknowledged with a 200 (so the provider
//      stops retrying) but NOT forwarded to the service.
//
// Design decisions:
//   • Reads body bytes once, re-injects them so the proxy can forward unchanged.
//   • Timing-safe comparison prevents signature oracle attacks.
//   • Both checks degrade gracefully: if the server key / Redis is absent the
//     check is skipped and the downstream service remains the sole verifier.
//   • Returns HTTP 200 (not 4xx) on signature failure and duplicates — Midtrans
//     (and most providers) retry any non-2xx response indefinitely.
//   • x-webhook-verified: <provider> is added to the forwarded request so the
//     downstream service knows the gateway already pre-checked the signature.
// =============================================================================

import { timingSafeEqual, createHash } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { env, getRedis } from "@/config";
import { logger } from "@/lib/logger";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * How long (seconds) a processed-notification ID is remembered in Redis.
 * 7 days — well beyond Midtrans's 24-hour retry window.
 */
const IDEMPOTENCY_TTL_SECONDS = 7 * 24 * 60 * 60; // 604 800

const IDEMPOTENCY_KEY_PREFIX = "webhook:idempotency";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Compare two hex strings in constant time to prevent timing oracle attacks.
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBytes = Buffer.from(a, "hex");
  const bBytes = Buffer.from(b, "hex");
  if (aBytes.length !== bBytes.length) return false;
  try {
    return timingSafeEqual(aBytes, bBytes);
  } catch {
    return false;
  }
}

/**
 * Re-inject a body ArrayBuffer back into the Hono context's raw request so
 * downstream middleware and the proxy helper can still read it.
 *
 * Hono's Context.req.raw is writable at runtime even though the TypeScript
 * types don't expose it — this is a well-known body re-injection pattern.
 */
function reInjectBody(c: Context, body: ArrayBuffer, extraHeaders?: Headers): void {
  const original = c.req.raw;
  const headers = extraHeaders ?? original.headers;
  const patched = new Request(original.url, {
    method: original.method,
    headers,
    body,
    // @ts-expect-error — Bun requires duplex for streaming request bodies
    duplex: "half",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (c.req as any).raw = patched;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ── Generic factory ───────────────────────────────────────────────────────────

export interface WebhookVerifyOptions {
  /** Provider name used in logs and forwarded headers (e.g. "midtrans") */
  provider: string;

  /**
   * Signature verifier.
   * - Return `null`  → key not configured, skip silently
   * - Return `true`  → signature is valid
   * - Return `false` → signature is invalid, block request
   */
  verify: (rawBody: ArrayBuffer, bodyJson: unknown) => boolean | null;

  /**
   * Optional: extract a stable unique ID from the parsed body for
   * replay-attack / duplicate-delivery deduplication via Redis.
   *
   * For Midtrans this is `transaction_id` — Midtrans guarantees it is unique
   * per notification event and reuses it on retries of the same event.
   *
   * Return `null` / `undefined` to skip idempotency for this delivery
   * (e.g. the field is missing in a test notification).
   */
  idempotencyKey?: (bodyJson: unknown) => string | null | undefined;
}

/**
 * Create a webhook verification + replay-protection middleware.
 *
 * Processing order:
 *  1. Read raw body bytes
 *  2. Parse as JSON
 *  3. Verify provider signature  → 200 + WEBHOOK_SIGNATURE_INVALID on failure
 *  4. Check Redis idempotency    → 200 + WEBHOOK_DUPLICATE on replay
 *  5. Re-inject body + set headers, call next()
 */
export function createWebhookVerifier(
  options: WebhookVerifyOptions
): MiddlewareHandler {
  const { provider, verify, idempotencyKey } = options;

  return async (c, next) => {
    const ip =
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-real-ip") ??
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    // ── 1. Read raw body ──────────────────────────────────────────────────────
    let rawBody: ArrayBuffer;
    try {
      rawBody = await c.req.raw.arrayBuffer();
    } catch {
      logger.warn(`[webhook-verify:${provider}] Failed to read body`, { ip });
      return c.json({ success: false, error: "Failed to read request body" }, 400);
    }

    // ── 2. Parse JSON ─────────────────────────────────────────────────────────
    let bodyJson: unknown;
    try {
      bodyJson = JSON.parse(new TextDecoder().decode(rawBody));
    } catch {
      logger.warn(`[webhook-verify:${provider}] Invalid JSON body`, { ip });
      reInjectBody(c, rawBody);
      return c.json({ success: false, error: "Webhook body must be valid JSON" }, 400);
    }

    // ── 3. Signature verification ─────────────────────────────────────────────
    const sigResult = verify(rawBody, bodyJson);

    if (sigResult === null) {
      logger.warn(
        `[webhook-verify:${provider}] Signature key not configured — skipping verification`,
        { ip, path: c.req.path }
      );
      // Skip both sig check and idempotency (can't safely deduplicate without
      // verifying identity first)
      reInjectBody(c, rawBody);
      await next();
      return;
    }

    if (!sigResult) {
      logger.warn(`[webhook-verify:${provider}] Invalid signature`, {
        ip,
        path: c.req.path,
        orderId: isRecord(bodyJson) ? bodyJson["order_id"] : undefined,
      });
      // Return 200 so Midtrans stops retrying this spoofed request
      return c.json(
        {
          success: false,
          error: {
            code: "WEBHOOK_SIGNATURE_INVALID",
            message: `${provider} webhook signature verification failed`,
          },
        },
        200
      );
    }

    // ── 4. Replay-attack / duplicate-delivery protection ──────────────────────
    if (idempotencyKey) {
      const redis = getRedis();
      const notifId = idempotencyKey(bodyJson);

      if (!redis) {
        logger.warn(
          `[webhook-verify:${provider}] Redis unavailable — skipping idempotency check`,
          { ip }
        );
      } else if (notifId) {
        const redisKey = `${IDEMPOTENCY_KEY_PREFIX}:${provider}:${notifId}`;

        // SET key 1 NX EX <ttl> — atomic "set if not exists"
        // Returns "OK" on first delivery, null on subsequent deliveries
        const setResult = await redis.set(redisKey, "1", "EX", IDEMPOTENCY_TTL_SECONDS, "NX");

        if (setResult === null) {
          // Key already existed → this is a duplicate delivery
          logger.info(`[webhook-verify:${provider}] Duplicate notification — already processed`, {
            ip,
            notifId,
            redisKey,
          });
          // Acknowledge with 200 so the provider stops retrying
          return c.json(
            {
              success: true,
              data: {
                code: "WEBHOOK_DUPLICATE",
                message: "Notification already processed",
                notificationId: notifId,
              },
            },
            200
          );
        }

        logger.debug(`[webhook-verify:${provider}] Idempotency key recorded`, {
          notifId,
          ttlDays: IDEMPOTENCY_TTL_SECONDS / 86400,
        });
      } else {
        logger.warn(
          `[webhook-verify:${provider}] No idempotency key extracted — skipping dedup`,
          { ip, path: c.req.path }
        );
      }
    }

    // ── 5. Pass through — re-inject body + mark as verified ───────────────────
    const newHeaders = new Headers(c.req.raw.headers);
    newHeaders.set("x-webhook-verified", provider);

    reInjectBody(c, rawBody, newHeaders);
    c.res.headers.set("x-webhook-verified", provider);

    logger.debug(`[webhook-verify:${provider}] Verified and forwarded`, {
      ip,
      path: c.req.path,
    });

    await next();
  };
}

// ── Midtrans webhook verifier ─────────────────────────────────────────────────

/**
 * Midtrans signature formula:
 *   SHA512(order_id + status_code + gross_amount + server_key)
 *
 * Idempotency key: `transaction_id` — unique per Midtrans payment event,
 * reused on retries so duplicates are naturally deduplicated.
 *
 * Reference: https://docs.midtrans.com/reference/verifying-payment-status
 */
export const verifyMidtransWebhook = createWebhookVerifier({
  provider: "midtrans",

  verify(_rawBody, bodyJson): boolean | null {
    const serverKey = env.MIDTRANS_SERVER_KEY;
    if (!serverKey) return null; // soft skip

    if (!isRecord(bodyJson)) return false;

    const orderId      = bodyJson["order_id"];
    const statusCode   = bodyJson["status_code"];
    const grossAmount  = bodyJson["gross_amount"];
    const signatureKey = bodyJson["signature_key"];

    if (
      typeof orderId      !== "string" ||
      typeof statusCode   !== "string" ||
      typeof grossAmount  !== "string" ||
      typeof signatureKey !== "string"
    ) {
      return false;
    }

    const expected = createHash("sha512")
      .update(orderId + statusCode + grossAmount + serverKey)
      .digest("hex");

    return safeCompare(expected, signatureKey);
  },

  idempotencyKey(bodyJson): string | null {
    if (!isRecord(bodyJson)) return null;
    const txId = bodyJson["transaction_id"];
    return typeof txId === "string" && txId.length > 0 ? txId : null;
  },
});
