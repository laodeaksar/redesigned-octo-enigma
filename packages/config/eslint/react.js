import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import baseConfig from "./base.js";

/**
 * ESLint config for React apps — apps/web (TanStack Start), packages/ui.
 * Usage:
 *   import reactConfig from "@my-ecommerce/config/eslint/react";
 *   export default reactConfig;
 */
const reactConfig = [
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      react:        reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // ── React core ────────────────────────────────────────────────
      ...reactPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope":  "off",   // Not needed in React 17+
      "react/prop-types":          "off",   // Using TypeScript instead
      "react/self-closing-comp":   "error",
      "react/jsx-curly-brace-presence": [
        "warn",
        { props: "never", children: "never" },
      ],
      "react/jsx-boolean-value": ["warn", "never"],

      // ── React Hooks ───────────────────────────────────────────────
      ...reactHooksPlugin.configs.recommended.rules,
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default reactConfig;
