import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";

export const envPaymentService = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().min(1024).max(65535).default(3004),

    // ── Auth (for internal JWT verification) ──────────────────────────────────
    JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),

    // ── Midtrans ──────────────────────────────────────────────────────────────
    MIDTRANS_SERVER_KEY: z.string().min(1),
    MIDTRANS_CLIENT_KEY: z.string().min(1),
    MIDTRANS_IS_PRODUCTION: z
      .string()
      .transform((v) => v === "true")
      .default(false),
    /**
     * The public URL of this service, used to set Midtrans notification_url.
     * Example: https://api.my-ecommerce.com/payments/webhook
     */
    PAYMENT_WEBHOOK_URL: z.url(),

    // ── Internal service URLs ─────────────────────────────────────────────────
    ORDER_SERVICE_URL: z.url(),

    // ── RabbitMQ ──────────────────────────────────────────────────────────────
    RABBITMQ_URL: z.url().startsWith("amqp"),
  },
  runtimeEnv: process.env,
});
