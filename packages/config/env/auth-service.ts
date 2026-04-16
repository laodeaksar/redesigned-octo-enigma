import { z } from "zod"
import { createEnv } from "@t3-oss/env-core"

export const envAuthService = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().min(1024).max(65535).default(3001),

    // ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: z.url().startsWith("postgresql://"),

    // ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

    // ── Better-auth ───────────────────────────────────────────────────────────
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),

    // ── OAuth (optional) ──────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),

    // ── RabbitMQ ──────────────────────────────────────────────────────────────
    RABBITMQ_URL: z.url().startsWith("amqp"),
  },
  runtimeEnv: process.env,
})
