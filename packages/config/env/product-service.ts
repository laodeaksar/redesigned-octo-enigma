import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";
import {
  jwtSecretSchema,
  portSchema,
  postgresUrlSchema,
  rabbitmqUrlSchema,
  redisUrlSchema,
} from ".";

export const envProductService = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: portSchema,

    // ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: postgresUrlSchema,

    // ── Cache ─────────────────────────────────────────────────────────────────
    REDIS_URL: redisUrlSchema,
    CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),

    // ── Auth (for internal JWT verification) ──────────────────────────────────
    JWT_SECRET: jwtSecretSchema,

    // ── Storage (product images) ──────────────────────────────────────────────
    S3_ENDPOINT: z.url().optional(),
    S3_BUCKET: z.string().min(1).optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    S3_REGION: z.string().default("ap-southeast-1"),
    S3_PUBLIC_URL: z.url().optional(),

    // ── RabbitMQ ──────────────────────────────────────────────────────────────
    RABBITMQ_URL: rabbitmqUrlSchema,
  },
  runtimeEnv: process.env,
});
