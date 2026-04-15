import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";

import {
  jwtSecretSchema,
  nodeEnvSchema,
  portSchema,
} from "./index";

export const env = createEnv({
  server: {
    NODE_ENV: nodeEnvSchema,
    PORT: portSchema.default(3004),

    // ── Auth (for internal JWT verification) ──────────────────────────────────
    JWT_SECRET: jwtSecretSchema,

    // ── Midtrans ──────────────────────────────────────────────────────────────
    MIDTRANS_SERVER_KEY: z.string().min(1),
    MIDTRANS_CLIENT_KEY: z.string().min(1),
    MIDTRANS_IS_PRODUCTION: z
      .string()
      .transform((v) => v === "true")
      .default(false),
    /**
     * The public URL of this service, used to set Midtrans notification_url.
     * Example: https://api.my-ecommerce.com/payments/webhook
     */
    PAYMENT_WEBHOOK_URL: z.url(),

    // ── Internal service URLs ─────────────────────────────────────────────────
    ORDER_SERVICE_URL: z.url(),

    // ── RabbitMQ ──────────────────────────────────────────────────────────────
    RABBITMQ_URL: z.url().startsWith("amqp"),
  },
  runtimeEnv: process.env,
});
