// =============================================================================
// eslint-config/astro.js
// ESLint config for Astro SSR apps with React islands
//
// Usage — apps/web/.eslintrc.cjs:
//   module.exports = {
//     root: true,
//     extends: ["@repo/eslint-config/astro"],
//     parserOptions: { project: true, tsconfigRootDir: __dirname },
//   };
// =============================================================================

import base from "./index.js";

/** @type {import("eslint").Linter.Config} */
const config = {
  // ── Parser: Astro parser handles .astro files; TS parser handles the rest
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },

  plugins: [
    ...(base.plugins ?? []),
    "react",
    "react-hooks",
    "jsx-a11y",
    "astro",
  ],

  extends: [
    ...base.extends,

    // ── Astro ──────────────────────────────────────────────────────────────
    // Configures parser for .astro files automatically
    "plugin:astro/recommended",
    // Enforce accessibility in .astro templates
    "plugin:astro/jsx-a11y-strict",

    // ── React (for island .tsx files) ──────────────────────────────────────
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",

    // Must be last — disables formatting rules that conflict with Prettier
    "prettier",
  ],

  rules: {
    ...base.rules,

    // ── React ──────────────────────────────────────────────────────────────
    "react/react-in-jsx-scope": "off",     // not needed with new JSX transform
    "react/prop-types": "off",             // TypeScript handles this
    "react/display-name": "warn",
    "react/no-unescaped-entities": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // ── Astro-specific ─────────────────────────────────────────────────────
    // Astro components don't need explicit return types
    "@typescript-eslint/explicit-module-boundary-types": "off",

    // Allow `set:html` directive (Astro's safe HTML injection)
    "astro/no-set-html-directive": "warn",

    // Prefer Astro's Image component over raw <img> in .astro files
    "astro/no-unused-define-vars-in-style": "error",

    // ── JSX a11y ───────────────────────────────────────────────────────────
    "jsx-a11y/anchor-is-valid": [
      "error",
      {
        components: ["a"],
        specialLink: ["href"],
        aspects: ["invalidHref", "preferButton"],
      },
    ],

    // ── Relax for Astro patterns ───────────────────────────────────────────
    // Astro frontmatter often uses await at top-level
    "@typescript-eslint/no-floating-promises": "warn",

    // Islands frequently use non-null assertions on DOM elements
    "@typescript-eslint/no-non-null-assertion": "warn",

    // nanostores .get() returns typed values — allow
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-argument": "off",
  },

  settings: {
    ...base.settings,
    react: { version: "detect" },
  },

  // ── Per-file overrides ────────────────────────────────────────────────────
  overrides: [
    // ── .astro files — use Astro's own parser ────────────────────────────
    {
      files: ["*.astro"],
      parser: "astro-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"],
      },
      rules: {
        // Astro components use top-level `return` in frontmatter for redirects
        "no-unreachable": "off",

        // Astro auto-imports its types — unused vars in frontmatter are fine
        "@typescript-eslint/no-unused-vars": [
          "warn",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_|^Astro$" },
        ],
      },
    },

    // ── API routes (.ts in pages/api/) ───────────────────────────────────
    {
      files: ["src/pages/api/**/*.ts"],
      rules: {
        // API routes export named functions — display name not relevant
        "react/display-name": "off",
      },
    },

    // ── React islands (.tsx) ─────────────────────────────────────────────
    {
      files: ["src/components/islands/**/*.tsx", "src/components/**/*.tsx"],
      rules: {
        // Islands use void for fire-and-forget event handlers
        "@typescript-eslint/no-floating-promises": [
          "error",
          { ignoreVoid: true },
        ],
      },
    },

    // ── Config files (.mjs, .js at root) ─────────────────────────────────
    {
      files: ["*.mjs", "*.js", "postcss.config.js", "tailwind.config.ts"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-require-imports": "off",
      },
    },

    // ── nanostores stores ─────────────────────────────────────────────────
    {
      files: ["src/stores/**/*.ts"],
      rules: {
        // Stores export mutable atoms — that's the API
        "@typescript-eslint/no-explicit-any": "warn",
      },
    },
  ],

  ignorePatterns: [
    "dist/",
    ".astro/",
    "node_modules/",
    "*.config.mjs",
    "*.d.ts",
  ],
};

export default config;

