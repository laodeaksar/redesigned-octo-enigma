import { z } from "zod";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parses a comma-separated string into an array. Useful for CORS_ORIGINS. */
const commaSeparated = z
  .string()
  .transform((val) => val.split(",").map((s) => s.trim()).filter(Boolean));

/** Accepts "true" | "1" | "false" | "0" as boolean. */
const booleanString = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

// ─── Shared base (all server services inherit this) ───────────────────────────

export const baseServerSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

// ─── Database ─────────────────────────────────────────────────────────────────

export const postgresSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid postgres:// URL"),
  DATABASE_POOL_MIN: z.coerce.number().int().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),
});

export const mongoSchema = z.object({
  MONGODB_URI: z
    .string()
    .url("MONGODB_URI must be a valid mongodb:// or mongodb+srv:// URL"),
  MONGODB_DB_NAME: z.string().min(1),
});

// ─── Auth / Clerk ─────────────────────────────────────────────────────────────

export const clerkSchema = z.object({
  CLERK_SECRET_KEY:        z.string().startsWith("sk_"),
  CLERK_PUBLISHABLE_KEY:   z.string().startsWith("pk_"),
  CLERK_WEBHOOK_SECRET:    z.string().startsWith("whsec_").optional(),
});

export const jwtSchema = z.object({
  JWT_SECRET:              z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  JWT_EXPIRES_IN:          z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN:  z.string().default("7d"),
});

// ─── RabbitMQ ─────────────────────────────────────────────────────────────────

export const rabbitMQSchema = z.object({
  RABBITMQ_URL: z
    .string()
    .url("RABBITMQ_URL must be a valid amqp:// or amqps:// URL"),
  RABBITMQ_EXCHANGE: z.string().default("ecommerce.events"),
  RABBITMQ_PREFETCH:  z.coerce.number().int().min(1).default(10),
});

// ─── Midtrans ─────────────────────────────────────────────────────────────────

export const midtransSchema = z.object({
  MIDTRANS_SERVER_KEY:     z.string().min(1),
  MIDTRANS_CLIENT_KEY:     z.string().min(1),
  MIDTRANS_IS_PRODUCTION:  booleanString.default("false"),
  MIDTRANS_MERCHANT_ID:    z.string().optional(),
});

// ─── Email ────────────────────────────────────────────────────────────────────

export const emailSchema = z.object({
  EMAIL_FROM:     z.string().email("EMAIL_FROM must be a valid email address"),
  EMAIL_PROVIDER: z.enum(["resend", "smtp", "ses"]).default("resend"),
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  SMTP_HOST:      z.string().optional(),
  SMTP_PORT:      z.coerce.number().int().optional(),
  SMTP_USER:      z.string().optional(),
  SMTP_PASS:      z.string().optional(),
});

// ─── Service URLs (inter-service HTTP) ────────────────────────────────────────

export const serviceUrlsSchema = z.object({
  AUTH_SERVICE_URL:     z.string().url().default("http://localhost:3001"),
  PRODUCT_SERVICE_URL:  z.string().url().default("http://localhost:3002"),
  ORDER_SERVICE_URL:    z.string().url().default("http://localhost:3003"),
  PAYMENT_SERVICE_URL:  z.string().url().default("http://localhost:3004"),
});

// ─── CORS ─────────────────────────────────────────────────────────────────────

export const corsSchema = z.object({
  CORS_ORIGINS: commaSeparated.default("http://localhost:3000,http://localhost:3100"),
});

// ─── Per-service composed schemas ─────────────────────────────────────────────

/** api-gateway */
export const gatewayEnvSchema = baseServerSchema
  .merge(jwtSchema)
  .merge(serviceUrlsSchema)
  .merge(corsSchema);

/** auth-service */
export const authEnvSchema = baseServerSchema
  .merge(postgresSchema)
  .merge(clerkSchema)
  .merge(jwtSchema);

/** product-service */
export const productEnvSchema = baseServerSchema
  .merge(postgresSchema)
  .merge(jwtSchema);

/** order-service */
export const orderEnvSchema = baseServerSchema
  .merge(mongoSchema)
  .merge(rabbitMQSchema)
  .merge(jwtSchema);

/** payment-service */
export const paymentEnvSchema = baseServerSchema
  .merge(postgresSchema)
  .merge(midtransSchema)
  .merge(jwtSchema);

/** email-worker */
export const emailWorkerEnvSchema = baseServerSchema
  .merge(rabbitMQSchema)
  .merge(emailSchema);

// ─── createEnv util ───────────────────────────────────────────────────────────

/**
 * Validates process.env against a Zod schema and throws on failure.
 * Call once at service startup before anything else.
 *
 * @example
 * // In auth-service/src/env.ts
 * import { createEnv, authEnvSchema } from "@my-ecommerce/config/env/server";
 * export const env = createEnv(authEnvSchema);
 */
export function createEnv(schema) {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ✗  ${issue.path.join(".")} — ${issue.message}`)
      .join("\n");

    throw new Error(
      `\n❌ Invalid environment variables:\n${formatted}\n` +
      `\nEnsure your .env file is loaded before this module runs.\n`,
    );
  }

  return result.data;
}
