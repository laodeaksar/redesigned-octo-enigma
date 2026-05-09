// =============================================================================
// Database Package ESLint Configuration
// TypeScript database package with Drizzle ORM
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
      // Schema definitions pakai banyak chaining — izinkan
      "@typescript-eslint/no-unsafe-call":         "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  }
);
