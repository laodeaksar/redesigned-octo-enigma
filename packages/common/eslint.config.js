// =============================================================================
// Common Package ESLint Configuration
// Node.js/TypeScript common
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
  }
);
