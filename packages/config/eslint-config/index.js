/** @type {import("eslint").Linter.Config} */
const config = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "import", "unicorn"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  rules: {
    // ── TypeScript ────────────────────────────────────────────────────────────
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports", fixStyle: "inline-type-imports" },
    ],
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": [
      "error",
      { checksVoidReturn: { attributes: false } },
    ],
    "@typescript-eslint/require-await": "error",
    "@typescript-eslint/await-thenable": "error",

    // ── Imports ───────────────────────────────────────────────────────────────
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling"],
          "index",
          "type",
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "import/no-duplicates": "error",
    "import/no-cycle": "warn",

    // ── Unicorn ───────────────────────────────────────────────────────────────
    "unicorn/prefer-node-protocol": "error",
    "unicorn/no-array-for-each": "error",
    "unicorn/prefer-string-slice": "error",

    // ── General ───────────────────────────────────────────────────────────────
    "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    eqeqeq: ["error", "always"],
    curly: "error",
  },
  settings: {
    "import/resolver": {
      typescript: { alwaysTryTypes: true },
    },
  },
  ignorePatterns: ["dist/", "build/", ".turbo/", "node_modules/", "*.config.js"],
};

export default config;
