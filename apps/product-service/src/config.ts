// =============================================================================
// Config — validated env + singleton DB, Redis, S3, and BullMQ queue clients
// =============================================================================

import { env as rawEnv } from "@repo/env/product-service";
import { createDrizzleClient } from "@repo/database/drizzle";
import { createQueue, QUEUES } from "@repo/common/events";
import { S3Client } from "@aws-sdk/client-s3";
import Redis from "ioredis";

export const env = rawEnv;

// ── PostgreSQL via Drizzle ────────────────────────────────────────────────────

export const db = createDrizzleClient({
  url: env.DATABASE_URL,
  maxConnections: 10,
  debug: env.NODE_ENV === "development",
});

export type DB = typeof db;

// ── Redis (cache + BullMQ) ────────────────────────────────────────────────────

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});

redis.on("error", (err) => console.warn("[Redis] Error:", err.message));
redis.on("connect", () => console.info("[Redis] Connected"));

/** Separate ioredis instance for cache (maxRetriesPerRequest must be a number for cache) */
export const cacheRedis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times) => Math.min(times * 200, 2000),
  lazyConnect: true,
});

cacheRedis.on("error", (err) => console.warn("[Redis:cache] Error:", err.message));

/** Get the cache redis instance (used by cache helpers) */
export function getRedis(): Redis { return cacheRedis; }

// ── BullMQ queues ─────────────────────────────────────────────────────────────

export const queues = {
  stockDeduct:  createQueue(QUEUES.PRODUCT_STOCK_DEDUCT, redis),
  stockRestore: createQueue(QUEUES.PRODUCT_STOCK_RESTORE, redis),
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

