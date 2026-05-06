// =============================================================================
// Config — validated env + MongoDB + Drizzle (vouchers) + BullMQ queue clients
// =============================================================================

import { env as rawEnv } from "@repo/env/order-service";
import { createDrizzleClient } from "@repo/database/drizzle";
import { connectMongo } from "@repo/database/mongo";

export const env = rawEnv;

// ── PostgreSQL via Drizzle (vouchers) ─────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL ?? "";

export const db = createDrizzleClient({
  url: DATABASE_URL || "postgres://placeholder:placeholder@localhost:5432/placeholder",
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

// ── Redis + BullMQ queues (disabled — Redis not available in this env) ─────────

export const redis = null;

export const queues = {
  emailOrderConfirmation: null as null,
  emailOrderShipped:      null as null,
  emailOrderCancelled:    null as null,
  orderCancelExpired:     null as null,
  stockRestore:           null as null,
} as const;
