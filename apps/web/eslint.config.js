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

      // ── TanStack Query guardrails ──────────────────────────────────────────
      // Enforce @tanstack/react-query (v5) — forbid the old 'react-query' package
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-query",
              message: "Use '@tanstack/react-query' instead of the deprecated 'react-query' package.",
            },
          ],
          patterns: [
            {
              group: ["react-query/*"],
              message: "Use '@tanstack/react-query' instead.",
            },
          ],
        },
      ],

      // Forbid raw fetch() calls outside of src/lib/ — use fetcher.ts or apiProxy
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "CallExpression[callee.name='fetch']:not([callee.object.name])",
          message:
            "Direct fetch() calls are discouraged outside src/lib/. " +
            "Use fetcher(), fetcherPost(), or apiProxy from @/lib/fetcher or @/lib/api.",
        },
      ],
    },
  }
);
