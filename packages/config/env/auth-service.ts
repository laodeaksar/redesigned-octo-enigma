import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";
import {
  jwtSecretSchema,
  portSchema,
  postgresUrlSchema,
  rabbitmqUrlSchema,
} from ".";

export const envAuthService = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: portSchema,

    // ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: postgresUrlSchema,

    // ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET: jwtSecretSchema,
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
    RABBITMQ_URL: rabbitmqUrlSchema,
  },
  runtimeEnv: process.env,
});
