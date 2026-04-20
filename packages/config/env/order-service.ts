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
    PORT: portSchema.default(3003),

    // ── MongoDB ───────────────────────────────────────────────────────────────
    MONGODB_URL: z.string().url().startsWith("mongodb"),
    MONGODB_DB_NAME: z.string().min(1).default("orders"),

    // ── Auth (for internal JWT verification) ──────────────────────────────────
    JWT_SECRET: jwtSecretSchema,

    // ── Internal service URLs ─────────────────────────────────────────────────
    PRODUCT_SERVICE_URL: z.url(),
    PAYMENT_SERVICE_URL: z.url(),

    // ── Redis (BullMQ job queues) ──────────────────────────────────────────────
    REDIS_URL: redisUrlSchema,

    // ── Order settings ────────────────────────────────────────────────────────
    /** Duration in minutes before an unpaid order is auto-cancelled */
    ORDER_EXPIRY_MINUTES: z.coerce.number().int().positive().default(60),
  },
  runtimeEnv: process.env,
});

