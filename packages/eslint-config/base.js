// =============================================================================
// Base ESLint Configuration
// Standard rules for TypeScript and JavaScript files
// =============================================================================

import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      // Best practices
      "no-var": "error",
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-console": "warn",
      "no-debugger": "error",
      "no-alert": "warn",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-return-await": "error",
      "prefer-promise-reject-errors": "error",
      "require-await": "error",
      "no-async-promise-executor": "error",

      // Style
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],
      "dot-notation": ["error", { "allow-patterns": ["*"] }],
      "no-lonely-if": "error",
      "no-useless-return": "error",
      "prefer-promise-reject-errors": "error",
      "radix": ["error", "always"],
      "sort-imports": [
        "warn",
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
          ignoreMemberSort: true,
        },
      ],

      // Potential bugs
      "no-unmodified-loop-condition": "error",
      "no-unused-expressions": ["error", { "allowShortCircuit": true, "allowTernary": true }],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];