// =============================================================================
// Config — validated env + singleton DB and BullMQ queue clients
// =============================================================================

import { env as rawEnv } from "@repo/env/payment-service";
import { createDrizzleClient } from "@repo/database/drizzle";

export async function initRabbitMQ(): Promise<void> {
  console.warn("RabbitMQ not configured — payment events disabled in this environment");
}

export const env = rawEnv;

// ── PostgreSQL via Drizzle ────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL ?? "";

export const db = createDrizzleClient({
  url: DATABASE_URL || "postgres://placeholder:placeholder@localhost:5432/placeholder",
  maxConnections: 5,
  debug: env.NODE_ENV === "development",
});

export type DB = typeof db;

// ── Redis + BullMQ queues (disabled — Redis not available in this env) ─────────

export const redis = null;

export const queues = {
  emailOrderConfirmation: null as null,
} as const;

// ── Order Service HTTP base URL ───────────────────────────────────────────────

export const ORDER_SERVICE_URL = env.ORDER_SERVICE_URL.replace(/\/$/, "");
