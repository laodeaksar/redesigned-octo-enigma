// =============================================================================
// Testing ESLint Configuration
// Rules specific to Jest and React Testing Library
// =============================================================================

import testingLibrary from "eslint-plugin-testing-library";

export default [
  {
    plugins: {
      "testing-library": testingLibrary,
    },
    rules: {
      // Testing Library rules
      "testing-library/no-dom-assertions": "error",
      "testing-library/no-render-in-setup": "error",
      "testing-library/no-render-in-lifecycle": "error",
      "testing-library/no-unclear-transfer": "error",
      "testing-library/no-wait-for-side-effects": "error",
      "testing-library/no-manual-cleanup": "error",
      "testing-library/no-node-access": "warn",
      "testing-library/prefer-explicit-assert": "error",
      "testing-library/prefer-find-by": "warn",
      "testing-library/prefer-presence-queries": "warn",
      "testing-library/prefer-screen-queries": "error",
      "testing-library/render-result-naming-convention": "warn",
    },
  },
];