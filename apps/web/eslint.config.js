// =============================================================================
// Web App ESLint Configuration
// Astro + React Islands frontend application
// =============================================================================

import { astroConfig } from "@repo/eslint-config/astro";
import { reactConfig }  from "@repo/eslint-config/react";
import tseslint          from "typescript-eslint";

export default tseslint.config(
  // React islands (.tsx)
  {
    files: ["**/*.tsx"],
    ...tseslint.config(...reactConfig)[0],
  },

  // Astro pages (.astro)
  ...astroConfig,

  {
    languageOptions: {
      parserOptions: {
        project:             true,
        tsconfigRootDir:     import.meta.dirname,
        extraFileExtensions: [".astro"],
      },
    },

    rules: {
      // nanostores action — void return pattern
      "@typescript-eslint/no-misused-promises": "off",
    },
  }
);
