// =============================================================================
// Config — validated env + Redis + BullMQ worker connection
// =============================================================================

import Redis from "ioredis";

import { env as rawEnv } from "@repo/env/email-worker";

export const env = rawEnv;

// ── Redis (BullMQ workers read jobs from here) ────────────────────────────────

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
});

redis.on("error", err => console.warn("[Redis] Error:", err.message));
redis.on("connect", () => console.info("[Redis] Connected"));
