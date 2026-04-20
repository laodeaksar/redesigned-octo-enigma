import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";

import { nodeEnvSchema, redisUrlSchema } from "./index";

export const env = createEnv({
  server: {
    NODE_ENV: nodeEnvSchema,

    // ── Redis (BullMQ job queues) ─────────────────────────────────────────────
    REDIS_URL: redisUrlSchema,

    // ── SMTP ──────────────────────────────────────────────────────────────────
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().default(587),
    SMTP_SECURE: z
      .string()
      .transform((v) => v === "true")
      .default(false),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),

    // ── Email identity ────────────────────────────────────────────────────────
    EMAIL_FROM_NAME: z.string().default("My Ecommerce"),
    EMAIL_FROM_ADDRESS: z.email(),
    EMAIL_REPLY_TO: z.email().optional(),

    // ── Resend (alternative to SMTP) ──────────────────────────────────────────
    RESEND_API_KEY: z.string().optional(),
  },
  runtimeEnv: process.env,
});

