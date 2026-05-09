// =============================================================================
// Paymemt Service ESLint Configuration
// Node.js/TypeScript payment service
// =============================================================================

import { node } from "@repo/eslint-config/node";
import tseslint  from "typescript-eslint";

export default tseslint.config(
  ...node,
  {
    languageOptions: {
      parserOptions: {
        project:         true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Webhook handler sering cek raw body — izinkan
      "@typescript-eslint/no-explicit-any": "warn",
      // Log semua payment events untuk audit trail
      "no-console": "off",
    },
  }
);
