// =============================================================================
// Email Worker ESLint Configuration
// Node.js/TypeScript background worker
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
      // Worker process — console.log adalah logging utama
      "no-console": "off",
    },
  }
);
