// =============================================================================
// Config — validated env + singleton DB and BullMQ queue clients
// =============================================================================

import { env as rawEnv } from "@repo/env/payment-service";
import { createDrizzleClient } from "@repo/database/drizzle";
import { createQueue, QUEUES } from "@repo/common/events";
import Redis from "ioredis";

export const env = rawEnv;

// ── PostgreSQL via Drizzle ────────────────────────────────────────────────────

export const db = createDrizzleClient({
  url: env.DATABASE_URL,
  maxConnections: 5,
  debug: env.NODE_ENV === "development",
});

export type DB = typeof db;

// ── Redis + BullMQ queues ─────────────────────────────────────────────────────

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
});

redis.on("error", (err) => console.warn("[Redis] Error:", err.message));
redis.on("connect", () => console.info("[Redis] Connected"));

export const queues = {
  emailOrderConfirmation: createQueue(QUEUES.EMAIL_ORDER_CONFIRMATION, redis),
} as const;

// ── Order Service HTTP base URL ───────────────────────────────────────────────

export const ORDER_SERVICE_URL = env.ORDER_SERVICE_URL.replace(/\/$/, "");
