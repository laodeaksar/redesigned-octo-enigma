import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";

import {
  jwtSecretSchema,
  nodeEnvSchema,
  portSchema,
  postgresUrlSchema,
  redisUrlSchema,
} from "./index";

export const env = createEnv({
  server: {
    NODE_ENV: nodeEnvSchema,
    PORT: portSchema.default(3002),

    // ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: postgresUrlSchema,

    // ── Redis (cache + BullMQ job queues) ────────────────────────────────────
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
  },
  runtimeEnv: process.env,
});

