// =============================================================================
// React Hooks ESLint Configuration
// Rules specific to React Hooks
// =============================================================================

import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  {
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      // React Hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];