import { z } from "zod";

/**
 * Client-safe environment variables.
 * ⚠️  NEVER put secrets here — these values are bundled into the browser.
 *
 * Variables must be prefixed with NEXT_PUBLIC_ (Next.js) or VITE_ (Vite/TanStack).
 * Both prefixes are handled so the same schema works for apps/admin and apps/web.
 *
 * Usage in apps/web (TanStack Start):
 *   import { createClientEnv, clientEnvSchema } from "@my-ecommerce/config/env/client";
 *   export const env = createClientEnv(import.meta.env);
 *
 * Usage in apps/admin (Next.js):
 *   import { createClientEnv, clientEnvSchema } from "@my-ecommerce/config/env/client";
 *   export const env = createClientEnv(process.env);
 */

// ─── Schema ───────────────────────────────────────────────────────────────────

export const clientEnvSchema = z.object({
  // ── API ───────────────────────────────────────────────────────────
  /** Public-facing API Gateway URL */
  NEXT_PUBLIC_API_URL:        z.string().url().optional(),
  VITE_API_URL:               z.string().url().optional(),

  // ── Clerk (public keys only) ──────────────────────────────────────
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:  z.string().startsWith("pk_").optional(),
  VITE_CLERK_PUBLISHABLE_KEY:         z.string().startsWith("pk_").optional(),

  NEXT_PUBLIC_CLERK_SIGN_IN_URL:  z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL:  z.string().default("/sign-up"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/"),

  // ── Midtrans (client key is safe to expose) ───────────────────────
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY:  z.string().optional(),
  VITE_MIDTRANS_CLIENT_KEY:         z.string().optional(),

  // ── Feature flags ─────────────────────────────────────────────────
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  VITE_ENABLE_ANALYTICS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
})
// Require at least one API URL to be present
.refine(
  (data) => !!(data.NEXT_PUBLIC_API_URL || data.VITE_API_URL),
  { message: "Either NEXT_PUBLIC_API_URL or VITE_API_URL must be set" },
)
// Require at least one Clerk publishable key to be present
.refine(
  (data) =>
    !!(data.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || data.VITE_CLERK_PUBLISHABLE_KEY),
  {
    message:
      "Either NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY or VITE_CLERK_PUBLISHABLE_KEY must be set",
  },
);

// ─── Convenience getters ──────────────────────────────────────────────────────

/** Returns the resolved API URL regardless of prefix (NEXT_PUBLIC_ or VITE_). */
export function getApiUrl(env) {
  return env.NEXT_PUBLIC_API_URL ?? env.VITE_API_URL;
}

/** Returns the resolved Clerk publishable key. */
export function getClerkPublishableKey(env) {
  return (
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? env.VITE_CLERK_PUBLISHABLE_KEY
  );
}

// ─── createClientEnv util ─────────────────────────────────────────────────────

/**
 * Validates a raw env object (process.env or import.meta.env) and returns
 * the parsed, type-safe result. Throws with a human-readable message on failure.
 */
export function createClientEnv(rawEnv) {
  const result = clientEnvSchema.safeParse(rawEnv);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ✗  ${issue.path.join(".")} — ${issue.message}`)
      .join("\n");

    throw new Error(
      `\n❌ Invalid client environment variables:\n${formatted}\n`,
    );
  }

  return result.data;
}
