import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";

import {
  jwtSecretSchema,
  nodeEnvSchema,
  portSchema,
  redisUrlSchema,
} from "./index";

export const env = createEnv({
  server: {
    NODE_ENV: nodeEnvSchema,
    PORT: portSchema.default(3000),

    // ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET: jwtSecretSchema,
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

    // ── Rate limiting (Redis) ─────────────────────────────────────────────────
    REDIS_URL: redisUrlSchema,

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
});
