// =============================================================================
// Astro ESLint Configuration
// Rules specific to TypeScript code
// =============================================================================

import tseslint   from "typescript-eslint";
import astroPlugin from "eslint-plugin-astro";
import globals    from "globals";
import { base }   from "./base.js";

/** @type {import("typescript-eslint").ConfigArray} */
export const astroConfig = tseslint.config(
  ...base,

  // ── Astro files ──────────────────────────────────────────────────────────
  ...astroPlugin.configs.recommended,
  ...astroPlugin.configs["jsx-a11y-recommended"],

  {
    files: ["**/*.astro"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // Astro globals
        Astro: "readonly",
      },
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"],
      },
    },
    rules: {
      // ── Astro ────────────────────────────────────────────────────────────

      "astro/no-conflict-set-directives":       "error",
      "astro/no-unused-define-vars-in-style":   "error",
      "astro/no-set-html-directive":            "error", // set:html bisa XSS
      "astro/prefer-class-list-directive":      "warn",
      "astro/no-unused-css-selector":           "warn",

      // Frontmatter di .astro tidak butuh return-await
      "@typescript-eslint/return-await":        "off",

      // Frontmatter boleh async tanpa floating-promise check
      "@typescript-eslint/no-floating-promises": [
        "error",
        { ignoreIIFE: true },
      ],

      // Redirect dan Response bukan Promise biasa
      "@typescript-eslint/no-misused-promises": "off",
    },
  },

  // ── .astro frontmatter (TypeScript di dalam .astro) ──────────────────────
  {
    files: ["**/*.astro/*.ts", "*.astro/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        Astro: "readonly",
      },
    },
    rules: {
      // Dalam frontmatter, banyak top-level await yang valid
      "@typescript-eslint/no-floating-promises": "off",
    },
  },

  // ── API routes Astro (/src/pages/api/**) ─────────────────────────────────
  {
    files: ["**/pages/api/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  }
);

export default astroConfig;
