import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";
import { jwtSecretSchema, portSchema, redisUrlSchema } from ".";

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

    AUTH_SERVICE_URL: z.url(),
    PRODUCT_SERVICE_URL: z.url(),
    ORDER_SERVICE_URL: z.url(),
    PAYMENT_SERVICE_URL: z.url(),

    CORS_ORIGINS: z
      .string()
      .transform((val) => val.split(",").map((s) => s.trim())),
  },
  runtimeEnv: process.env,
});

