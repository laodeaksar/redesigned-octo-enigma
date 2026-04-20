// =============================================================================
// apps/web — ESLint configuration
// Extends the shared Astro preset from @my-ecommerce/eslint-config/astro
// =============================================================================

/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,

  extends: ["@repo/eslint-config/astro"],

  parserOptions: {
    // Enable type-aware linting — points at the app's own tsconfig
    project: true,
    tsconfigRootDir: __dirname,
    ecmaVersion: "latest",
    sourceType: "module",
  },

  // ── App-specific rule overrides ───────────────────────────────────────────
  rules: {
    // Astro pages use redirects via thrown Responses — allow throw in async
    "@typescript-eslint/only-throw-error": "off",

    // Allow console.info in Astro frontmatter for SSR debug logging
    "no-console": ["warn", { allow: ["warn", "error", "info"] }],

    // Midtrans Snap is loaded as a global via CDN script tag
    "no-undef": "off",
  },

  // ── Additional per-file overrides specific to this app ───────────────────
  overrides: [
    // ── Astro page files ─────────────────────────────────────────────────
    {
      files: ["src/pages/**/*.astro"],
      rules: {
        // Pages fetch data in frontmatter — allow unhandled promises via void
        "@typescript-eslint/no-floating-promises": [
          "warn",
          { ignoreVoid: true },
        ],
      },
    },

    // ── Middleware ────────────────────────────────────────────────────────
    {
      files: ["src/middleware.ts"],
      rules: {
        // Middleware reads cookies and redirects — consistent-return not needed
        "consistent-return": "off",
      },
    },

    // ── Client-side stores (vanilla JS patterns) ──────────────────────────
    {
      files: ["src/stores/**/*.ts"],
      rules: {
        // localStorage access is guarded by typeof checks
        "no-undef": "off",
      },
    },
  ],
};
