import baseConfig from "./base.js";

/**
 * ESLint config for server-side apps:
 *   api-gateway, auth-service, product-service,
 *   order-service, payment-service, email-worker
 *
 * Usage:
 *   import nodeConfig from "@my-ecommerce/config/eslint/node";
 *   export default nodeConfig;
 */
const nodeConfig = [
  ...baseConfig,
  {
    files: ["**/*.{ts,js,mjs}"],
    rules: {
      // Logging is fine in server processes
      "no-console": "off",

      // Async/await best practices for request handlers
      "@typescript-eslint/no-floating-promises":     "error",
      "@typescript-eslint/await-thenable":           "error",
      "@typescript-eslint/no-misused-promises":      "error",
      "@typescript-eslint/require-await":            "warn",

      // Stricter on server — avoid leaking sensitive data via `any`
      "@typescript-eslint/no-explicit-any":          "error",

      // Enforce explicit return types on exported handler functions
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
    languageOptions: {
      parserOptions: {
        // Enable type-aware linting (requires tsconfig)
        project: ["./tsconfig.json"],
        tsconfigRootDir: process.cwd(),
      },
    },
  },
  {
    // Relax type-aware rules in test files
    files: ["**/*.test.{ts,js}", "**/*.spec.{ts,js}", "**/tests/**"],
    rules: {
      "@typescript-eslint/no-explicit-any":      "warn",
      "@typescript-eslint/no-floating-promises": "warn",
    },
  },
];

export default nodeConfig;
