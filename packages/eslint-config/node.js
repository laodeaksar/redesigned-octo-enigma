// =============================================================================
// Node ESLint Configuration
// Exports all configurations as named exports
// =============================================================================

import tseslint  from "typescript-eslint";
import globals   from "globals";
import drizzle   from "eslint-plugin-drizzle";
import { base }  from "./base.js";

/** @type {import("typescript-eslint").ConfigArray} */
export const node = tseslint.config(
  ...base,

  // ── Node.js globals ─────────────────────────────────────────────────────
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // ── Drizzle ORM rules ────────────────────────────────────────────────────
  {
    files: ["**/*.ts"],
    plugins: { drizzle },
    rules: {
      // Wajib pakai .where() saat delete/update — hindari accidental full table mutation
      "drizzle/enforce-delete-with-where": [
        "error",
        { drizzleObjectName: ["db", "tx"] },
      ],
      "drizzle/enforce-update-with-where": [
        "error",
        { drizzleObjectName: ["db", "tx"] },
      ],
    },
  },

  // ── Service-specific patterns ─────────────────────────────────────────────
  {
    files: ["**/*.ts"],
    rules: {
      // Hindari process.exit() di dalam request handler — harus graceful shutdown
      "no-process-exit":                           "off", // pakai custom rule di bawah

      // Pastikan error di-throw bukan di-return langsung
      "@typescript-eslint/only-throw-error":       "error",

      // Await semua promise — critical di server-side
      "@typescript-eslint/no-floating-promises":   "error",
      "@typescript-eslint/return-await":           ["error", "in-try-catch"],

      // Izinkan console.log di worker files (logging)
      "no-console": ["warn", { allow: ["warn", "error", "info", "log"] }],
    },
  },

  // ── Worker files — lebih permissive (bukan HTTP handler) ─────────────────
  {
    files: ["**/*.worker.ts", "**/workers/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },

  // ── Migration files — skip semua rules ──────────────────────────────────
  {
    files: ["**/drizzle/migrations/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "drizzle/enforce-delete-with-where":  "off",
      "drizzle/enforce-update-with-where":  "off",
    },
  },

  // ── Seed files ───────────────────────────────────────────────────────────
  {
    files: ["**/seeds/**", "**/scripts/**"],
    rules: {
      "no-console":                              "off",
      "@typescript-eslint/no-floating-promises": "off",
    },
  }
);
