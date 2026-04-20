// =============================================================================
// Config — validated env + MongoDB + Drizzle (vouchers) + BullMQ queue clients
// =============================================================================

import { env as rawEnv } from "@repo/env/order-service";
import { createDrizzleClient } from "@repo/database/drizzle";
import { connectMongo } from "@repo/database/mongo";
import { createQueue, QUEUES } from "@repo/common/events";
import Redis from "ioredis";

export const env = rawEnv;

// ── PostgreSQL via Drizzle (vouchers) ─────────────────────────────────────────

export const db = createDrizzleClient({
  url: env.DATABASE_URL,
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

// ── Redis + BullMQ queues ─────────────────────────────────────────────────────

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
});

redis.on("error", (err) => console.warn("[Redis] Error:", err.message));
redis.on("connect", () => console.info("[Redis] Connected"));

export const queues = {
  emailOrderConfirmation: createQueue(QUEUES.EMAIL_ORDER_CONFIRMATION, redis),
  emailOrderShipped:      createQueue(QUEUES.EMAIL_ORDER_SHIPPED, redis),
  emailOrderCancelled:    createQueue(QUEUES.EMAIL_ORDER_CANCELLED, redis),
  orderCancelExpired:     createQueue(QUEUES.ORDER_CANCEL_EXPIRED, redis),
  stockRestore:           createQueue(QUEUES.PRODUCT_STOCK_RESTORE, redis),
} as const;

