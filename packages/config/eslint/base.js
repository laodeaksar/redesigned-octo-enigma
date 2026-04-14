import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

/**
 * Base ESLint config — used by every app and package.
 * Usage:
 *   import baseConfig from "@my-ecommerce/config/eslint/base";
 *   export default [...baseConfig];
 */
const baseConfig = [
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      // ── TypeScript ────────────────────────────────────────────────
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any":      "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",

      // ── General ───────────────────────────────────────────────────
      "no-console":             ["warn", { allow: ["warn", "error", "info"] }],
      "no-debugger":            "error",
      "prefer-const":           "error",
      "no-var":                 "error",
      "object-shorthand":       "error",
      "eqeqeq":                 ["error", "always", { null: "ignore" }],
      "no-duplicate-imports":   "error",
    },
  },
  {
    // Relax rules for config files at the project root
    files: ["*.config.{ts,js,mjs}", "turbo.json"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/build/**",
      "**/.cache/**",
    ],
  },
];

export default baseConfig;
