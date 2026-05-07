// =============================================================================
// Config — validated env + singleton clients + service registry
// =============================================================================

import { env as rawEnv } from "@repo/env/api-gateway";
import { createDrizzleClient } from "@repo/database/drizzle";
import Redis from "ioredis";

export const env = rawEnv;

// ── Service registry ──────────────────────────────────────────────────────────

export const SERVICES = {
  auth: env.AUTH_SERVICE_URL.replace(/\/$/, ""),
  product: env.PRODUCT_SERVICE_URL.replace(/\/$/, ""),
  order: env.ORDER_SERVICE_URL.replace(/\/$/, ""),
  payment: env.PAYMENT_SERVICE_URL.replace(/\/$/, ""),
} as const;

export type ServiceName = keyof typeof SERVICES;

// ── PostgreSQL via Drizzle (audit logs) ───────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL ?? "";

/**
 * Drizzle client for writing audit logs.
 * Null when DATABASE_URL is not available (gateway degrades gracefully).
 */
export const db = DATABASE_URL
  ? createDrizzleClient({
      url: DATABASE_URL,
      maxConnections: 3,
      debug: false,
    })
  : null;

// ── Redis ─────────────────────────────────────────────────────────────────────

let _redis: Redis | null = null;
let _redisAvailable = false;

export function getRedis(): Redis | null {
  if (!_redisAvailable) return null;
  return _redis;
}

export async function initRedis(): Promise<boolean> {
  const probe = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 0,
    enableReadyCheck: false,
    retryStrategy: () => null, // no retries on probe
  });

  try {
    await probe.connect();
    await probe.ping();
    await probe.quit();

    // Redis is available — create the real client with retries
    _redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 200, 3000),
    });
    _redis.on("error", (err) => console.warn("[Redis] Error:", err.message));
    _redis.on("connect", () => console.info("[Redis] Connected"));
    await _redis.connect();
    _redisAvailable = true;
    return true;
  } catch {
    probe.disconnect(false);
    console.warn("⚠ Redis unavailable — rate limiting disabled");
    return false;
  }
}
