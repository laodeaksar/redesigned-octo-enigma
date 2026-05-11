// =============================================================================
// Config — validated env + optional Redis singleton
// =============================================================================

import Redis from "ioredis";

import { env as rawEnv } from "@/env";

export const env = rawEnv;

// ── Redis (optional) ──────────────────────────────────────────────────────────

let _redis: Redis | null = null;
let _redisAvailable = false;

export function getRedis(): Redis | null {
  if (!_redisAvailable) return null;
  return _redis;
}

export async function initRedis(): Promise<boolean> {
  if (!env.REDIS_URL) return false;

  const probe = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 0,
    enableReadyCheck: false,
    retryStrategy: () => null,
  });

  try {
    await probe.connect();
    await probe.ping();
    _redis = probe;
    _redisAvailable = true;
    return true;
  } catch {
    await probe.quit().catch(() => {});
    return false;
  }
}

// ── Simple cache helpers ───────────────────────────────────────────────────────

export async function cacheGet(key: string): Promise<string | null> {
  try {
    return await _redis?.get(key) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  try {
    await _redis?.set(key, value, "EX", ttlSeconds);
  } catch {
    // silent — caching is best-effort
  }
}
