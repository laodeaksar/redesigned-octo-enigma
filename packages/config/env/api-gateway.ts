import { z } from "zod"
import { createEnv } from "@t3-oss/env-core"

export const envAPIGateway = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().min(1024).max(65535).default(3000),

    // ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

    // ── Rate limiting (Redis) ─────────────────────────────────────────────────
    REDIS_URL: z.url().startsWith("redis"),

    // ── Internal service URLs ─────────────────────────────────────────────────
    AUTH_SERVICE_URL: z.url(),
    PRODUCT_SERVICE_URL: z.url(),
    ORDER_SERVICE_URL: z.url(),
    PAYMENT_SERVICE_URL: z.url(),

    // ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: z
      .string()
      .transform((val) => val.split(",").map((s) => s.trim())),
  },
  runtimeEnv: process.env,
})
