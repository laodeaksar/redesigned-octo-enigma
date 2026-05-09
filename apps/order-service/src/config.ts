// =============================================================================
// Config — validated env + MongoDB + Drizzle (vouchers) + BullMQ queue clients
// =============================================================================

import Redis from "ioredis";

import { addJob, createQueue, QUEUES } from "@repo/common/events";
import { createDrizzleClient } from "@repo/database/drizzle";
import { connectMongo } from "@repo/database/mongo";
import { env as rawEnv } from "@repo/env/order-service";

export const env = rawEnv;

// ── PostgreSQL via Drizzle (vouchers) ─────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL ?? "";

export const db = createDrizzleClient({
  url:
    DATABASE_URL ||
    "postgres://placeholder:placeholder@localhost:5432/placeholder",
  maxConnections: 5,
  debug: env.NODE_ENV === "development",
});

export type DB = typeof db;

// ── MongoDB (orders) ──────────────────────────────────────────────────────────

export async function initMongo(): Promise<void> {
  await connectMongo({
    url: env.MONGODB_URL,
    dbName: env.MONGODB_DB_NAME,
    debug: env.NODE_ENV === "development",
  });
}

// ── Redis ─────────────────────────────────────────────────────────────────────

let _redis: Redis | null = null;
let _redisAvailable = false;

export function getRedis(): Redis | null {
  return _redisAvailable ? _redis : null;
}

export async function initRedis(): Promise<boolean> {
  try {
    const probe = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      enableReadyCheck: false,
      retryStrategy: () => null,
    });

    await probe.connect();
    await probe.ping();
    await probe.quit();

    _redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: times => Math.min(times * 200, 3000),
    });
    _redis.on("error", err => console.warn("[Redis] Error:", err.message));
    _redis.on("connect", () => console.info("[Redis] Connected"));

    _redisAvailable = true;
    return true;
  } catch {
    console.warn("⚠ Redis unavailable — email notifications disabled");
    return false;
  }
}

// ── Email queue helper — creates a fresh queue, enqueues job, then closes ─────
// BullMQ queues are lightweight; closing after each publish avoids idle
// connections. Each publish takes ~1ms.

export async function enqueueEmail<T>(
  queueName: string,
  data: T
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const queue = createQueue<T>(queueName, redis);
  try {
    await addJob(queue, data);
  } catch (err) {
    console.warn(`[email-queue] Failed to enqueue ${queueName}:`, err);
  } finally {
    await queue.close().catch(() => {});
  }
}

// Legacy-compat shape kept so nothing else needs changing
export const queues = {
  emailOrderConfirmation: null as null,
  emailOrderShipped: null as null,
  emailOrderCancelled: null as null,
  orderCancelExpired: null as null,
  stockRestore: null as null,
} as const;
