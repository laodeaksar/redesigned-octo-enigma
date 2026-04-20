// =============================================================================
// Config — validated env + singleton clients + service registry
// =============================================================================

import { env as rawEnv } from "@repo/env/api-gateway";
import Redis from "ioredis";

export const env = rawEnv;

// ── Service registry ──────────────────────────────────────────────────────────

/**
 * All internal downstream services.
 * api-gateway proxies requests to these base URLs.
 */
export const SERVICES = {
  auth: env.AUTH_SERVICE_URL.replace(/\/$/, ""),
  product: env.PRODUCT_SERVICE_URL.replace(/\/$/, ""),
  order: env.ORDER_SERVICE_URL.replace(/\/$/, ""),
  payment: env.PAYMENT_SERVICE_URL.replace(/\/$/, ""),
} as const;

export type ServiceName = keyof typeof SERVICES;

// ── Redis ─────────────────────────────────────────────────────────────────────

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;

  _redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 200, 3000),
  });

  _redis.on("error", (err) => {
    // Rate-limit degrades gracefully when Redis is unavailable
    console.warn("[Redis] Error:", err.message);
  });

  _redis.on("connect", () => {
    console.info("[Redis] Connected");
  });

  return _redis;
}

export async function initRedis(): Promise<Redis> {
  const redis = getRedis();
  await redis.connect();
  return redis;
}

