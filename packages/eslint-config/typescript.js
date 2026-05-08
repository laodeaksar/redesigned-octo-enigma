// =============================================================================
// TypeScript ESLint Configuration
// Rules specific to TypeScript code
// =============================================================================

import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        projectService: true,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-empty-function": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          prefer: "type-imports",
          fixStyle: "separator",
        },
      ],
      "@typescript-eslint/no-duplicate-imports": "warn",
      "@typescript-eslint/no-import-alias": "warn",
      "@typescript-eslint/order-imports": [
        "warn",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
        },
      ],
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain-error": "warn",
      "@typescript-eslint/prefer-as-const": "warn",
      "@typescript-eslint/prefer-enum-initializers": "warn",
      "@typescript-eslint/prefer-for-of": "warn",
      "@typescript-eslint/prefer-function-type": "warn",
      "@typescript-eslint/prefer-includes": "warn",
      "@typescript-eslint/prefer-literal-enum-member": "warn",
      "@typescript-eslint/prefer-namespace-keyword": "warn",
      "@typescript-eslint/prefer-readonly": "warn",
      "@typescript-eslint/prefer-readonly-require": "warn",
      "@typescript-eslint/sort-imports-expiration": "warn",
    },
  },
];