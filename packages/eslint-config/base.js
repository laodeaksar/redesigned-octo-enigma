// =============================================================================
// Base ESLint Configuration
// Standard rules for TypeScript and JavaScript files
// =============================================================================

import eslint        from "@eslint/js";
import tseslint      from "typescript-eslint";
import importX       from "eslint-plugin-import-x";
import unicorn       from "eslint-plugin-unicorn";
import globals       from "globals";

/** @type {import("typescript-eslint").ConfigArray} */
export const base = tseslint.config(
  // ── Ignored paths (global) ──────────────────────────────────────────────
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.min.js",
      "**/drizzle/migrations/**",  // generated migration files
    ],
  },

  // ── Base JS recommended ─────────────────────────────────────────────────
  eslint.configs.recommended,

  // ── TypeScript strict ───────────────────────────────────────────────────
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      globals: {
        ...globals.es2022,
      },
      parserOptions: {
        projectService: true,           // auto-detect tsconfig per file
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      "import-x": importX,
      unicorn,
    },

    rules: {
      // ── TypeScript ──────────────────────────────────────────────────────

      // Mengizinkan _ prefix untuk parameter yang sengaja tidak dipakai
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern:           "^_",
          varsIgnorePattern:           "^_",
          caughtErrorsIgnorePattern:   "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],

      // Konsistensi type vs interface
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],

      // Wajib type-only import — treeshaking lebih bersih
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // Izinkan void return di callback (banyak dipakai di event handler)
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],

      // Nonaktifkan aturan yang terlalu strict untuk proyek ini
      "@typescript-eslint/no-explicit-any":            "warn", // warn, bukan error
      "@typescript-eslint/no-non-null-assertion":      "warn",
      "@typescript-eslint/no-unsafe-assignment":       "warn",
      "@typescript-eslint/no-unsafe-call":             "warn",
      "@typescript-eslint/no-unsafe-member-access":    "warn",
      "@typescript-eslint/no-unsafe-return":           "warn",
      "@typescript-eslint/no-unsafe-argument":         "warn",

      // Izinkan empty catch (sudah banyak dipakai di store/wishlist)
      "@typescript-eslint/no-empty-function":          "off",

      // Izinkan require() di config file tertentu
      "@typescript-eslint/no-require-imports":         "off",

      // ── Imports ─────────────────────────────────────────────────────────

      "import-x/no-duplicates": "error",
      "import-x/no-cycle": [
        "error",
        { maxDepth: 5, ignoreExternal: true },
      ],
      "import-x/no-self-import":      "error",
      "import-x/no-useless-path-segments": "error",

      // Workspace package imports harus memakai path yang dideclare di exports
      "import-x/no-unresolved": "off", // TS sudah handle ini

      // ── Unicorn (best practices) ─────────────────────────────────────────

      // Pilih: enabled secara selektif, bukan unicorn/recommended semua
      "unicorn/prefer-node-protocol":      "error", // import "node:fs" bukan "fs"
      "unicorn/no-array-push-push":        "error",
      "unicorn/no-for-loop":               "error",
      "unicorn/prefer-array-flat-map":     "error",
      "unicorn/prefer-includes":           "error",
      "unicorn/prefer-string-slice":       "error",
      "unicorn/throw-new-error":           "error",
      "unicorn/no-useless-undefined":      "error",
      "unicorn/prefer-ternary":            ["error", "onlySingleLine"],
      "unicorn/consistent-empty-array-spread": "error",

      // Terlalu opinionated — matikan
      "unicorn/prevent-abbreviations":      "off",
      "unicorn/filename-case":              "off",
      "unicorn/no-null":                    "off",
      "unicorn/no-nested-ternary":          "off",

      // ── General JS/TS ────────────────────────────────────────────────────

      "no-console":        ["warn", { allow: ["warn", "error", "info"] }],
      "no-debugger":       "error",
      "no-alert":          "error",
      "prefer-const":      "error",
      "no-var":            "error",
      "object-shorthand":  "error",

      // Ternary chaining
      "no-nested-ternary": "off", // handled unicorn

      // Mencegah return tanpa nilai di async function
      "no-promise-executor-return": "error",

      // Sort imports (grouped: builtin → external → internal → relative)
      "import-x/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
            "type",
          ],
          "newlines-between": "never",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },

  // ── Test files — relax rules ────────────────────────────────────────────
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-explicit-any":        "off",
      "@typescript-eslint/no-unsafe-assignment":   "off",
      "@typescript-eslint/no-unsafe-call":         "off",
      "no-console":                                "off",
    },
  },

  // ── Config files — relax strict type-checking ───────────────────────────
  {
    files: ["*.config.{js,ts,mjs}", "*.config.*.{js,ts}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  }
);

