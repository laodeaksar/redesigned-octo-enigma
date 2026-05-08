import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

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
    MONGODB_URL: z.url().startsWith("mongodb"),
    MONGODB_DB_NAME: z.string().min(1).default("orders"),

    // ── Auth (for internal JWT verification) ──────────────────────────────────
    JWT_SECRET: jwtSecretSchema,
    PRODUCT_SERVICE_URL: z.url(),
    PAYMENT_SERVICE_URL: z.url(),
    AUTH_SERVICE_URL: z.url(),

    // ── RajaOngkir (shipping cost calculation) ────────────────────────────────
    RAJAONGKIR_API_KEY: z.string().min(1),
    /** RajaOngkir origin city ID — set to your warehouse city */
    RAJAONGKIR_ORIGIN: z.string().min(1).default("501"), // Jakarta Pusat = 501

    // ── Redis (BullMQ job queues) ──────────────────────────────────────────────
    REDIS_URL: redisUrlSchema,

    // ── Order settings ────────────────────────────────────────────────────────
    /** Duration in minutes before an unpaid order is auto-cancelled */
    ORDER_EXPIRY_MINUTES: z.coerce.number().int().positive().default(60),

    // ── Internal service key — shared secret for service-to-service calls ─────
    INTERNAL_SERVICE_KEY: z
      .string()
      .min(32)
      .default("internal-svc-key-dev-change-in-production-!!secret!!"),
  },
  runtimeEnv: process.env,
});
