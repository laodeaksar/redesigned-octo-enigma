// =============================================================================
// Tailwind CSS ESLint Configuration
// Rules for Tailwind CSS class ordering and best practices
// =============================================================================

// Note: This configuration is designed to work with eslint-plugin-tailwindcss
// Install with: npm install --save-dev @tailwindcss/eslint-plugin

export default [
  {
    plugins: {
      // Tailwind CSS plugin would be added here
      // "tailwindcss": require("@tailwindcss/eslint-plugin"),
    },
    settings: {
      tailwindcss: {
        callees: ["cn", "cv"],
        important: false,
        warnings: {
          // Configure warnings for common issues
          conflictingClass: "warn",
          duplicateClass: "warn",
        },
      },
    },
    rules: {
      // Tailwind CSS class ordering (requires @tailwindcss/eslint-plugin)
      // "tailwindcss/classnames-order": "warn",
      // "tailwindcss/classnames-space": "warn",
      // "tailwindcss/no-conflicting-classes": "error",
      // "tailwindcss/no-custom-classes": "warn",
      // "tailwindcss/no-shorthand-properties": "warn",
      // "tailwindcss/no-unsupported-classes": "warn",
      // "tailwindcss/no-unused-classes": "warn",
      // "tailwindcss/prefer-wildcard": "warn",
      // "tailwindcss/sort-classes": "warn",
    },
  },
];