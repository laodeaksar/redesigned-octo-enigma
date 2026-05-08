import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  /**
   * Server-side env vars — never exposed to the browser.
   */
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },

  /**
   * Client-side env vars — must be prefixed with NEXT_PUBLIC_.
   */
  clientPrefix: "PUBLIC_",
  client: {
    PUBLIC_API_URL: z.url(),
    PUBLIC_APP_URL: z.url(),

    // ── Midtrans client key (for Snap.js) ─────────────────────────────────────
    PUBLIC_MIDTRANS_CLIENT_KEY: z.string().min(1),
    PUBLIC_MIDTRANS_IS_PRODUCTION: z
      .string()
      .transform((v) => v === "true")
      .default(false),

    // ── Analytics (optional) ──────────────────────────────────────────────────
    PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
    PUBLIC_GTM_ID: z.string().optional(),
  },

  /**
   * Map client-side vars to their runtime values.
   * Required by @t3-oss/env-core for client vars.
   */
  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    PUBLIC_API_URL: process.env.PUBLIC_API_URL,
    PUBLIC_APP_URL: process.env.PUBLIC_APP_URL,
    PUBLIC_MIDTRANS_CLIENT_KEY:
      process.env.PUBLIC_MIDTRANS_CLIENT_KEY,
    PUBLIC_MIDTRANS_IS_PRODUCTION:
      process.env.PUBLIC_MIDTRANS_IS_PRODUCTION,
    PUBLIC_GA_MEASUREMENT_ID: process.env.PUBLIC_GA_MEASUREMENT_ID,
    PUBLIC_GTM_ID: process.env.PUBLIC_GTM_ID,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
