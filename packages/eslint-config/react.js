// =============================================================================
// React ESLint Configuration
// Rules specific to React components
// =============================================================================

import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // React specific rules
      "react/display-name": "warn",
      "react/forbid-component-props": "off",
      "react/forbid-elements": "off",
      "react/function-component-definition": [
        "warn",
        {
          namedComponents: "function",
          unnamedComponents: "arrow",
        },
      ],
      "react/jsx-boolean-prop-naming": "warn",
      "react/jsx-child-element-to-fragment": "warn",
      "react/jsx-curly-spacing": "warn",
      "react/jsx-equals-space": "warn",
      "react/jsx-first-prop-new-line": "warn",
      "react/jsx-key": "error",
      "react/jsx-max-props-per-line": "warn",
      "react/jsx-no-bind": [
        "warn",
        {
          ignore: ["jsx"],
        },
      ],
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-literals": "off",
      "react/jsx-no-undef": "error",
      "react/jsx-pascal-case": "error",
      "react/jsx-sort-props": "off",
      "react/jsx-uses-react": "off", // Not needed with React 17+
      "react/jsx-uses-vars": "error",
      "react/no-danger": "warn",
      "react/no-deprecated": "error",
      "react/no-deprecated-functions": "error",
      "react/no-did-mount-set-state": "error",
      "react/no-did-update-set-state": "error",
      "react/no-direct-mutation-state": "error",
      "react/no-is-mounted": "error",
      "react/no-nested-components": "warn",
      "react/no-set-state": "error",
      "react/no-string-refs": "error",
      "react/no-unknown-property": "error",
      "react/no-unsafe": "error",
      "react/no-unsafe-lifecycles": "error",
      "react/prefer-es6-class": "warn",
      "react/prefer-read-only-props": "warn",
      "react/prefer-stateless-function": "warn",
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/self-closing-comp": "warn",
      "react/sort-comp": "warn",
      "react/wrap-multilines-in-newline": "warn",
    },
  },
];