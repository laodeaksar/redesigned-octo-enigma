// =============================================================================
// Config — validated env + singleton DB and BullMQ queue clients
// =============================================================================

import { env as rawEnv } from "@repo/env/auth-service";
import { createDrizzleClient } from "@repo/database/drizzle";
import { createQueue, QUEUES } from "@repo/common/events";
import Redis from "ioredis";

export const env = rawEnv;

// ── PostgreSQL via Drizzle ────────────────────────────────────────────────────

export const db = createDrizzleClient({
  url: env.DATABASE_URL,
  maxConnections: 10,
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
  emailWelcome:         createQueue(QUEUES.EMAIL_WELCOME, redis),
  emailPasswordReset:   createQueue(QUEUES.EMAIL_PASSWORD_RESET, redis),
} as const;

