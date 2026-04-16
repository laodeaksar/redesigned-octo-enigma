import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";

export const envOrderService = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().min(1024).max(65535).default(3003),

    // ── MongoDB ───────────────────────────────────────────────────────────────
    MONGODB_URL: z.url().startsWith("mongodb"),
    MONGODB_DB_NAME: z.string().min(1).default("orders"),

    // ── Auth (for internal JWT verification) ──────────────────────────────────
    JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),

    // ── Internal service URLs ─────────────────────────────────────────────────
    PRODUCT_SERVICE_URL: z.url(),
    PAYMENT_SERVICE_URL: z.url(),

    // ── RabbitMQ ──────────────────────────────────────────────────────────────
    RABBITMQ_URL: z.url().startsWith("amqp"),

    // ── Order settings ────────────────────────────────────────────────────────
    /** Duration in minutes before an unpaid order is auto-cancelled */
    ORDER_EXPIRY_MINUTES: z.coerce.number().int().positive().default(60),
  },
  runtimeEnv: process.env,
});
