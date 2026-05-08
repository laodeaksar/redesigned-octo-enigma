// =============================================================================
// Config — validated env + singleton DB, Redis, S3, and BullMQ queue clients
// =============================================================================

import { S3Client } from "@aws-sdk/client-s3";
import { createDrizzleClient } from "@repo/database/drizzle";
import { env as rawEnv } from "@repo/env/product-service";

export const env = rawEnv;

// ── PostgreSQL via Drizzle ────────────────────────────────────────────────────

export const db = createDrizzleClient({
  url: env.DATABASE_URL,
  maxConnections: 10,
  debug: env.NODE_ENV === "development",
});

export type DB = typeof db;

// ── Redis (cache + BullMQ) — optional, gracefully disabled if unavailable ─────

let _redis: import("ioredis").default | null = null;
let _cacheRedis: import("ioredis").default | null = null;

export async function initRedis(): Promise<boolean> {
  try {
    const Redis = (await import("ioredis")).default;

    _redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: () => null, // don't retry on startup probe
    });

    _redis.on("error", (err) => console.warn("[Redis] Error:", err.message));

    await _redis.ping();

    // Switch to retry strategy after successful connect
    _redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    _redis.on("error", (err) => console.warn("[Redis] Error:", err.message));
    _redis.on("connect", () => console.info("[Redis] Connected"));

    _cacheRedis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      lazyConnect: true,
    });
    _cacheRedis.on("error", (err) =>
      console.warn("[Redis:cache] Error:", err.message)
    );
    await _cacheRedis.connect().catch(() => {});

    return true;
  } catch {
    console.warn("⚠ Redis unavailable — running without cache/queues");
    _redis = null;
    _cacheRedis = null;
    return false;
  }
}

export function getRedisClient(): import("ioredis").default | null {
  return _redis;
}

/** Get the cache redis instance (used by cache helpers) */
export function getRedis(): import("ioredis").default | null {
  return _cacheRedis;
}

/** No-op publisher — stock events not emitted in this environment */
export function getPublisher() {
  return {
    emit: async (_event: string, _data: unknown) => {
      console.debug(`[publisher] event skipped (no RabbitMQ): ${_event}`);
    },
  };
}

// ── Null-safe queue stubs ─────────────────────────────────────────────────────

export const queues = {
  stockDeduct: null as null,
  stockRestore: null as null,
} as const;

// ── S3 / Object Storage ───────────────────────────────────────────────────────

export const s3Client = env.S3_ENDPOINT
  ? new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY ?? "",
        secretAccessKey: env.S3_SECRET_KEY ?? "",
      },
      forcePathStyle: true,
    })
  : null;
