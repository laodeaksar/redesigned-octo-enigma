import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";

import { nodeEnvSchema, redisUrlSchema } from "./index";

export const env = createEnv({
  server: {
    NODE_ENV: nodeEnvSchema,

    // ── App URL (used in email links) ─────────────────────────────────────────
    APP_URL: z.string().url().default("http://localhost:5000"),

    // ── Redis (BullMQ job queues) ─────────────────────────────────────────────
    REDIS_URL: redisUrlSchema,

    // ── SMTP (optional when RESEND_API_KEY is provided) ───────────────────────
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().int().default(587),
    SMTP_SECURE: z
      .string()
      .transform((v) => v === "true")
      .default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),

    // ── Email identity ────────────────────────────────────────────────────────
    EMAIL_FROM_NAME: z.string().default("My Ecommerce"),
    EMAIL_FROM_ADDRESS: z.string().email().default("noreply@my-ecommerce.com"),
    EMAIL_REPLY_TO: z.string().email().optional(),

    // ── Resend (alternative to SMTP) ──────────────────────────────────────────
    RESEND_API_KEY: z.string().optional(),

    // ── Logging ───────────────────────────────────────────────────────────────
    LOG_LEVEL: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal"])
      .default("info"),

    // ── Metrics ───────────────────────────────────────────────────────────────
    METRICS_PORT: z.coerce.number().int().default(9091),
  },
  runtimeEnv: process.env,
});
