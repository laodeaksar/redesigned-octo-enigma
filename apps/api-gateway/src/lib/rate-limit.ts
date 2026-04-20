// =============================================================================
// Rate limiter — Redis sliding-window algorithm
// Falls back to allow-all if Redis is unavailable (graceful degradation).
// =============================================================================

import type Redis from "ioredis";

export interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window size in seconds */
  windowSec: number;
  /** Key prefix to namespace different limiters */
  prefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;   // Unix timestamp (seconds) when the window resets
  limit: number;
}

/**
 * Sliding-window rate limiter using Redis ZSET.
 *
 * Algorithm:
 *  1. ZREMRANGEBYSCORE  — remove entries older than the window
 *  2. ZCARD             — count current requests in window
 *  3. If count < limit: ZADD + EXPIRE, return allowed=true
 *  4. Else: return allowed=false with retry-after info
 *
 * @param redis  Redis client
 * @param key    Unique key for this caller (e.g. "rl:ip:192.168.1.1")
 */
export async function checkRateLimit(
  redis: Redis,
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, windowSec, prefix = "rl" } = config;
  const fullKey = `${prefix}:${key}`;
  const now = Date.now(); // ms
  const windowMs = windowSec * 1000;
  const windowStart = now - windowMs;

  try {
    const pipeline = redis.pipeline();

    // Remove entries outside the window
    pipeline.zremrangebyscore(fullKey, 0, windowStart);
    // Count current requests
    pipeline.zcard(fullKey);
    // Add this request
    pipeline.zadd(fullKey, now, `${now}-${Math.random()}`);
    // Extend TTL
    pipeline.expire(fullKey, windowSec + 1);

    const results = await pipeline.exec();
    const count = (results?.[1]?.[1] as number) ?? 0;

    const allowed = count < limit;
    const remaining = Math.max(0, limit - count - 1);
    const resetAt = Math.ceil((now + windowMs) / 1000);

    return { allowed, remaining, resetAt, limit };
  } catch {
    // Redis failure → allow request (fail open)
    return { allowed: true, remaining: limit, resetAt: 0, limit };
  }
}

// ── Pre-configured limiters ───────────────────────────────────────────────────

export const RATE_LIMITS = {
  /** Default: 100 req / 60s per IP */
  default: { limit: 100, windowSec: 60, prefix: "rl:default" },
  /** Auth endpoints: 20 req / 60s per IP (prevent brute-force) */
  auth: { limit: 20, windowSec: 60, prefix: "rl:auth" },
  /** Checkout: 10 req / 60s per user (prevent order spam) */
  checkout: { limit: 10, windowSec: 60, prefix: "rl:checkout" },
  /** Strict: 5 req / 60s (forgot-password, etc.) */
  strict: { limit: 5, windowSec: 60, prefix: "rl:strict" },
} as const satisfies Record<string, RateLimitConfig>;

