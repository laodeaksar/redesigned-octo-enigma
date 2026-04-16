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
   * Client-side env vars — TanStack Start uses VITE_ prefix.
   */
  clientPrefix: "VITE_",
  client: {
    VITE_API_URL: z.string().url(),//z.url(),
    VITE_APP_URL: z.url(),

    // ── Auth ──────────────────────────────────────────────────────────────────
    VITE_AUTH_URL: z.url(),

    // ── Feature flags ─────────────────────────────────────────────────────────
    VITE_ENABLE_MOCK_DATA: z
      .string()
      .transform((v) => v === "true")
      .default(false),
  },

  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    VITE_API_URL: process.env.VITE_API_URL,
    VITE_APP_URL: process.env.VITE_APP_URL,
    VITE_AUTH_URL: process.env.VITE_AUTH_URL,
    VITE_ENABLE_MOCK_DATA: process.env.VITE_ENABLE_MOCK_DATA,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
