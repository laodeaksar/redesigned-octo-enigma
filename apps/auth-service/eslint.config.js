// =============================================================================
// Auth Service ESLint Configuration
// Node.js/TypeScript authentication service
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
      // bcrypt + crypto — beberapa operasi async yang sulit dilacak
      "@typescript-eslint/no-floating-promises": "warn",
    },
  }
);
