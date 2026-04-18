export { createEnv } from "@t3-oss/env-core";
export { z } from "zod";

// ── Reusable schema fragments ────────────────────────────────────────────────

import { z } from "zod";

/** Standard JWT secret field — min 32 chars */
export const jwtSecretSchema = z.string().min(32, "JWT secret must be at least 32 characters");

/** Standard port field */
export const portSchema = z.coerce.number().int().min(1024).max(65535);

/** Standard database URL */
export const postgresUrlSchema = z.url().startsWith("postgresql://");

/** Standard RabbitMQ URL */
export const rabbitmqUrlSchema = z.url().startsWith("amqp");

/** Standard Redis URL */
export const redisUrlSchema = z.url().startsWith("redis");

/** NODE_ENV */
export const nodeEnvSchema = z
  .enum(["development", "production", "test"])
  .default("development");
