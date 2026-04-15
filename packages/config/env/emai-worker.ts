import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";

import { nodeEnvSchema } from "./index";

export const env = createEnv({
  server: {
    NODE_ENV: nodeEnvSchema,

    // ── RabbitMQ ──────────────────────────────────────────────────────────────
    RABBITMQ_URL: z.url().startsWith("amqp"),
    /** Comma-separated list of queue names this worker consumes */
    RABBITMQ_QUEUES: z
      .string()
      .default("email.welcome,email.order-confirmation,email.password-reset")
      .transform((val) => val.split(",").map((s) => s.trim())),
    RABBITMQ_PREFETCH: z.coerce.number().int().positive().default(10),

    // ── SMTP (primary) ────────────────────────────────────────────────────────
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

    // ── Resend (alternative — only required if using Resend) ──────────────────
    RESEND_API_KEY: z.string().optional(),
  },
  runtimeEnv: process.env,
});
