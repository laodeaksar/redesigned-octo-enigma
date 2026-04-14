import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "url";
import { dirname } from "path";
import baseConfig from "./base.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * ESLint config for Next.js apps (apps/admin).
 * Usage:
 *   import nextConfig from "@my-ecommerce/config/eslint/next";
 *   export default nextConfig;
 */
const nextConfig = [
  ...baseConfig,
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Next.js specific
      "@next/next/no-html-link-for-pages":  "error",
      "@next/next/no-img-element":          "warn",

      // Allow default exports for pages / route handlers
      "import/no-anonymous-default-export": "off",
    },
  },
  {
    // Route handlers & server actions may use Node globals
    files: ["**/app/**/{route,actions,page}.{ts,tsx}", "**/pages/api/**/*.{ts,tsx}"],
    rules: {
      "no-console": "off",
    },
  },
];

export default nextConfig;
