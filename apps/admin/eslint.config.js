// =============================================================================
// Admin App ESLint Configuration
// React + TanStack Router admin dashboard
// =============================================================================

import { reactConfig } from "@repo/eslint-config/react";
import tseslint         from "typescript-eslint";

export default tseslint.config(
  ...reactConfig,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project:         true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TanStack Router — banyak generated types
      "@typescript-eslint/no-explicit-any": "warn",

      // Recharts props — legacy any types dari library
      "@typescript-eslint/no-unsafe-assignment":   "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },

  // TanStack Router auto-generated files
  {
    files: ["src/routeTree.gen.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any":     "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "import-x/order":                          "off",
    },
  }
);
