// =============================================================================
// Rate-limit middleware — wraps checkRateLimit for Hono routes
// =============================================================================

import { createMiddleware } from "hono/factory";

import { failure } from "@repo/common/schemas";

import { getRedis } from "@/config";
import {
  checkRateLimit,
  RATE_LIMITS,
  type RateLimitConfig,
} from "@/lib/rate-limit";

/**
 * Returns a Hono middleware that enforces a rate limit.
 *
 * The rate-limit key is:
 *   - If authenticated: userId  (user-level limit — fairer for shared IPs)
 *   - Otherwise: client IP
 *
 * @param config  One of RATE_LIMITS presets or a custom RateLimitConfig
 */
export function rateLimitMiddleware(config: RateLimitConfig = RATE_LIMITS.default) {
  return createMiddleware(async (c, next) => {
    const redis = getRedis();
    const user = c.var.user;

    // Use userId for authenticated requests, IP for anonymous
    const identifier =
      user?.id ??
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-real-ip") ??
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    const result = await checkRateLimit(redis, identifier, config);

    // Always set rate-limit headers
    c.header("X-RateLimit-Limit", String(result.limit));
    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Reset", String(result.resetAt));

    if (!result.allowed) {
      c.header("Retry-After", String(result.resetAt - Math.floor(Date.now() / 1000)));
      return c.json(
        failure(
          "RATE_LIMIT_EXCEEDED",
          "Too many requests — please slow down"
        ),
        429
      );
    }

    await next();
  });
}

/**
 * IP-only rate limiter — always keys by client IP, never by user ID.
 *
 * Use this for unauthenticated public endpoints (e.g. webhooks) where
 * `c.var.user` is always null and the identifier must always be the IP.
 */
export function ipRateLimitMiddleware(config: RateLimitConfig) {
  return createMiddleware(async (c, next) => {
    const redis = getRedis();

    const ip =
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-real-ip") ??
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    const result = await checkRateLimit(redis, ip, config);

    c.header("X-RateLimit-Limit",     String(result.limit));
    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Reset",     String(result.resetAt));

    if (!result.allowed) {
      c.header(
        "Retry-After",
        String(result.resetAt - Math.floor(Date.now() / 1000))
      );
      return c.json(
        failure("RATE_LIMIT_EXCEEDED", "Too many requests — please slow down"),
        429
      );
    }

    await next();
  });
}

// ── Pre-wired presets ─────────────────────────────────────────────────────────

export const defaultRateLimit  = rateLimitMiddleware(RATE_LIMITS.default);
export const authRateLimit     = rateLimitMiddleware(RATE_LIMITS.auth);
export const checkoutRateLimit = rateLimitMiddleware(RATE_LIMITS.checkout);
export const strictRateLimit   = rateLimitMiddleware(RATE_LIMITS.strict);

/**
 * Webhook rate limiter — IP-keyed, 20 deliveries / 60s by default.
 * Applied before signature verification so spoofed floods are dropped
 * before any crypto work or DB writes.
 * Override the ceiling with WEBHOOK_RATE_LIMIT_MAX env var.
 */
export const webhookRateLimit = ipRateLimitMiddleware(RATE_LIMITS.webhook);

