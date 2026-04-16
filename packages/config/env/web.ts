import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const envWeb = createEnv({
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
  clientPrefix: "NEXT_PUBLIC_",
  client: {
    NEXT_PUBLIC_API_URL: z.url(),
    NEXT_PUBLIC_APP_URL: z.url(),

    // ── Midtrans client key (for Snap.js) ─────────────────────────────────────
    NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: z.string().min(1),
    NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION: z.coerce.boolean().default(false),
      /*.string()
      .transform((v) => v === "true")
      .default("false"),*/

    // ── Analytics (optional) ──────────────────────────────────────────────────
    NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
    NEXT_PUBLIC_GTM_ID: z.string().optional(),
  },

  /**
   * Map client-side vars to their runtime values.
   * Required by @t3-oss/env-core for client vars.
   */
  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_MIDTRANS_CLIENT_KEY:
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION:
      process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
