// =============================================================================
// API Gateway ESLint Configuration
// Node.js/TypeScript backend service
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
      // api-gateway boleh log semua untuk observability
      "no-console": "off",
    },
  }
);
