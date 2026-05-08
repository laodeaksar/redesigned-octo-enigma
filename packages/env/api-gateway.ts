import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";
import { jwtSecretSchema, portSchema, redisUrlSchema, postgresUrlSchema } from ".";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: portSchema,

    JWT_SECRET: jwtSecretSchema,
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

    REDIS_URL: redisUrlSchema,

    // ── Database (audit logs) ─────────────────────────────────────────────────
    DATABASE_URL: postgresUrlSchema,
      /*z
      .string()
      .min(1)
      .refine((v) => v.startsWith("postgresql://") || v.startsWith("postgres://"), {
        message: "DATABASE_URL must start with postgresql:// or postgres://",
      })
      .optional(),*/

    AUTH_SERVICE_URL: z.url(),
    PRODUCT_SERVICE_URL: z.url(),
    ORDER_SERVICE_URL: z.url(),
    PAYMENT_SERVICE_URL: z.url(),

    CORS_ORIGINS: z
      .string()
      .transform((val) => val.split(",").map((s) => s.trim())),

    // ── Payment gateway (gateway-level webhook verification) ──────────────────
    /**
     * Midtrans server key — used at the gateway to pre-verify webhook
     * signatures before forwarding to payment-service (defense in depth).
     * Optional: if absent, verification is skipped here and the
     * payment-service remains the sole verifier.
     */
    MIDTRANS_SERVER_KEY: z.string().min(1).optional(),

    // ── Security alerting (all optional) ─────────────────────────────────────
    /** Webhook URL — POST JSON alert payload (Slack / Discord / Teams / custom) */
    ALERT_WEBHOOK_URL: z.url().optional(),
    /** Comma-separated email addresses to notify (requires email-worker + SMTP) */
    ALERT_EMAIL_TO: z.string().optional(),
    /** Minimum threat level that triggers an alert: LOW | MEDIUM | HIGH | CRITICAL */
    ALERT_THRESHOLD_LEVEL: z
      .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
      .default("HIGH"),
    /** How often the threat monitor polls (seconds) */
    ALERT_MONITOR_INTERVAL_SECONDS: z.coerce.number().int().min(10).default(60),
    /** Minimum gap between alerts for the same level (minutes) */
    ALERT_COOLDOWN_MINUTES: z.coerce.number().int().min(1).default(15),
    /** Human-readable environment name shown in alert payloads */
    ALERT_ENV_NAME: z.string().default("production"),
  },
  runtimeEnv: process.env,
});

