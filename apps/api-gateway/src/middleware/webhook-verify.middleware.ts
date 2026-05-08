// =============================================================================
// Webhook signature verification middleware
//
// Provides a factory for cryptographic webhook verification at the gateway
// layer — a first line of defense before requests reach downstream services.
//
// Currently implemented providers:
//   • Midtrans — SHA512(order_id + status_code + gross_amount + server_key)
//
// Design decisions:
//   • Reads body as ArrayBuffer once, re-injects it so the proxy can still
//     forward the raw bytes unchanged.
//   • Uses timing-safe comparison to prevent signature oracle attacks.
//   • If MIDTRANS_SERVER_KEY is not set, verification is SKIPPED (soft-fail)
//     with a warning — the payment-service still verifies independently.
//   • Adds x-webhook-verified: <provider> header so downstream services know
//     the signature was already checked at the edge.
// =============================================================================

import { timingSafeEqual, createHash } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { env } from "@/config";
import { logger } from "@/lib/logger";

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
 * Hono's Context.req.raw is writable at runtime even though types say
 * otherwise — this is a well-known body re-injection pattern.
 */
function reInjectBody(c: Context, body: ArrayBuffer): void {
  const original = c.req.raw;
  const patched = new Request(original.url, {
    method: original.method,
    headers: original.headers,
    body,
    // @ts-expect-error — Bun requires duplex for streaming bodies
    duplex: "half",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (c.req as any).raw = patched;
}

// ── Generic factory ───────────────────────────────────────────────────────────

export interface WebhookVerifyOptions {
  /** Provider name used in logs and headers (e.g. "midtrans") */
  provider: string;
  /**
   * Return null/undefined if the key is not configured (verification skipped).
   * Return true if signature is valid, false if invalid.
   */
  verify: (rawBody: ArrayBuffer, bodyJson: unknown) => boolean | null;
}

/**
 * Create a webhook verification middleware for a specific provider.
 *
 * The middleware:
 *  1. Reads the raw request body once
 *  2. Parses it as JSON
 *  3. Calls the provider's verify() function
 *  4. Rejects with 401 on failure (or 400 if body is not valid JSON)
 *  5. Re-injects the body so downstream handlers can still read it
 *  6. Adds x-webhook-verified header for downstream services
 */
export function createWebhookVerifier(
  options: WebhookVerifyOptions
): MiddlewareHandler {
  const { provider, verify } = options;

  return async (c, next) => {
    const ip =
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-real-ip") ??
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    // 1. Read raw body bytes
    let rawBody: ArrayBuffer;
    try {
      rawBody = await c.req.raw.arrayBuffer();
    } catch {
      logger.warn(`[webhook-verify:${provider}] Failed to read body`, { ip });
      return c.json(
        { success: false, error: "Failed to read request body" },
        400
      );
    }

    // 2. Parse body as JSON (needed for most provider signature schemes)
    let bodyJson: unknown;
    try {
      bodyJson = JSON.parse(new TextDecoder().decode(rawBody));
    } catch {
      logger.warn(`[webhook-verify:${provider}] Invalid JSON body`, { ip });
      // Re-inject raw bytes anyway so downstream gets the body
      reInjectBody(c, rawBody);
      return c.json(
        { success: false, error: "Webhook body must be valid JSON" },
        400
      );
    }

    // 3. Verify signature
    const result = verify(rawBody, bodyJson);

    if (result === null) {
      // Key not configured — soft skip with warning
      logger.warn(
        `[webhook-verify:${provider}] Signature key not configured — skipping verification`,
        { ip, path: c.req.path }
      );
      reInjectBody(c, rawBody);
      await next();
      return;
    }

    if (!result) {
      logger.warn(`[webhook-verify:${provider}] Invalid signature`, {
        ip,
        path: c.req.path,
        // Log a safe subset of the body for forensics (no PII beyond order_id)
        orderId: isRecord(bodyJson) ? bodyJson["order_id"] : undefined,
      });
      // Return 200 to prevent Midtrans (and other providers) from retrying
      // spoofed requests indefinitely — but include a clear error flag.
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

    // 4. Valid — re-inject body and mark as verified for downstream
    reInjectBody(c, rawBody);
    c.res.headers.set("x-webhook-verified", provider);
    // Also forward as a request header so the proxied service knows
    const patchedRaw = c.req.raw;
    const newHeaders = new Headers(patchedRaw.headers);
    newHeaders.set("x-webhook-verified", provider);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c.req as any).raw = new Request(patchedRaw.url, {
      method: patchedRaw.method,
      headers: newHeaders,
      body: patchedRaw.body,
      // @ts-expect-error — Bun duplex
      duplex: "half",
    });

    logger.debug(`[webhook-verify:${provider}] Signature verified`, {
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
 * Reference: https://docs.midtrans.com/reference/verifying-payment-status
 *
 * If MIDTRANS_SERVER_KEY is not configured in the gateway env, verification
 * is skipped and the payment-service acts as the sole verifier.
 */
export const verifyMidtransWebhook = createWebhookVerifier({
  provider: "midtrans",

  verify(_rawBody, bodyJson): boolean | null {
    const serverKey = env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      return null; // soft skip
    }

    if (!isRecord(bodyJson)) return false;

    const orderId = bodyJson["order_id"];
    const statusCode = bodyJson["status_code"];
    const grossAmount = bodyJson["gross_amount"];
    const signatureKey = bodyJson["signature_key"];

    // Require all four fields
    if (
      typeof orderId !== "string" ||
      typeof statusCode !== "string" ||
      typeof grossAmount !== "string" ||
      typeof signatureKey !== "string"
    ) {
      return false;
    }

    const expected = createHash("sha512")
      .update(orderId + statusCode + grossAmount + serverKey)
      .digest("hex");

    return safeCompare(expected, signatureKey);
  },
});

// ── Type guard ────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
