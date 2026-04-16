import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";

export const envProductService = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().min(1024).max(65535).default(3002),

    // ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: z.url().startsWith("postgresql://"),

    // ── Cache ─────────────────────────────────────────────────────────────────
    REDIS_URL: z.url().startsWith("redis").optional(),
    CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),

    // ── Auth (for internal JWT verification) ──────────────────────────────────
    JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),

    // ── Storage (product images) ──────────────────────────────────────────────
    S3_ENDPOINT: z.url().optional(),
    S3_BUCKET: z.string().min(1).optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    S3_REGION: z.string().default("ap-southeast-1"),
    S3_PUBLIC_URL: z.url().optional(),

    // ── RabbitMQ ──────────────────────────────────────────────────────────────
    RABBITMQ_URL: z.url().startsWith("amqp"),
  },
  runtimeEnv: process.env,
});
