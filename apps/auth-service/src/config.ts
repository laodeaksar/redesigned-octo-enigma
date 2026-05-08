// =============================================================================
// Config — validated env + singleton DB and BullMQ queue clients
// =============================================================================

import { createDrizzleClient } from "@repo/database/drizzle";
import { env as rawEnv } from "@repo/env/auth-service";

export const env = rawEnv;

// ── PostgreSQL via Drizzle ────────────────────────────────────────────────────

export const db = createDrizzleClient({
  url: env.DATABASE_URL,
  maxConnections: 10,
  debug: env.NODE_ENV === "development",
});

export type DB = typeof db;

// ── Redis + BullMQ queues (lazy, no-op when Redis unavailable) ────────────────

export const queues = {
  emailWelcome: null as null,
  emailPasswordReset: null as null,
} as const;

export const redis = null;
