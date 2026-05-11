// =============================================================================
// Env — Zod-validated environment variables for the checkout service
// =============================================================================

import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3004),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  API_GATEWAY_URL: z
    .string()
    .url()
    .default("http://localhost:3000")
    .describe("Base URL of the API gateway — all proxy calls go here"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5000")
    .describe("Comma-separated list of allowed CORS origins"),
  REDIS_URL: z
    .string()
    .url()
    .optional()
    .describe("Redis connection URL — optional, caching disabled if absent"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  if (process.env["SKIP_ENV_VALIDATION"] === "true") {
    console.warn(
      "[checkout] ⚠ Env validation skipped (SKIP_ENV_VALIDATION=true)"
    );
  } else {
    console.error("[checkout] ❌ Invalid environment variables:");
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
}

export const env = (parsed.success ? parsed.data : schema.parse({})) as z.infer<
  typeof schema
>;
