// =============================================================================
// React ESLint Configuration
// Rules specific to React components
// =============================================================================

import tseslint   from "typescript-eslint";
import react      from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y   from "eslint-plugin-jsx-a11y";
import globals    from "globals";
import { base }   from "./base.js";

/** @type {import("typescript-eslint").ConfigArray} */
export const reactConfig = tseslint.config(
  ...base,

  // ── Browser globals ──────────────────────────────────────────────────────
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // ── React ────────────────────────────────────────────────────────────────
  {
    files: ["**/*.{tsx,jsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y":    jsxA11y,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // ── React core ──────────────────────────────────────────────────────

      // Tidak perlu import React di React 17+ (new JSX transform)
      "react/react-in-jsx-scope":  "off",
      "react/jsx-uses-react":      "off",

      // Self-closing elements
      "react/self-closing-comp": ["error", { component: true, html: true }],

      // Key prop di list
      "react/jsx-key": [
        "error",
        { checkFragmentShorthand: true, checkKeyMustBeforeSpread: true },
      ],

      // Prop types tidak perlu — pakai TypeScript
      "react/prop-types": "off",

      // Hindari array index sebagai key (bisa menyebabkan bugs di reorder)
      "react/no-array-index-key": "warn",

      // Tidak boleh set innerHTML langsung
      "react/no-danger": "error",

      // Fragment shorthand
      "react/jsx-fragments":            ["error", "syntax"],

      // Boolean prop — tulis isLoading bukan isLoading={true}
      "react/jsx-boolean-value":        ["error", "never"],

      // Curly braces — konsisten
      "react/jsx-curly-brace-presence": [
        "error",
        { props: "never", children: "never" },
      ],

      // Sort props (nama dulu, baru handler, baru className)
      "react/sort-prop-types": "off",   // terlalu strict

      // Component naming
      "react/display-name":             "off", // banyak arrow function component

      // ── React Hooks ────────────────────────────────────────────────────

      "react-hooks/rules-of-hooks":  "error",
      "react-hooks/exhaustive-deps": "warn",

      // ── Accessibility ───────────────────────────────────────────────────

      "jsx-a11y/alt-text":                  "error",
      "jsx-a11y/aria-props":                "error",
      "jsx-a11y/aria-role":                 "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/anchor-is-valid":           "warn",
      "jsx-a11y/label-has-associated-control": "error",

      // Interactive elements harus bisa difocus
      "jsx-a11y/interactive-supports-focus": "warn",
    },
  },

  // ── nanostores — tidak perlu await (reactive/sync API) ───────────────────
  {
    files: ["**/stores/**/*.ts", "**/*.store.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
    },
  },

  // ── Island components — client:load, tidak ada SSR concerns ──────────────
  {
    files: ["**/islands/**/*.tsx", "**/components/islands/**/*.tsx"],
    rules: {
      // localStorage akses di islands itu valid (client-only)
      "unicorn/prefer-global-this": "off",
    },
  }
);

export default reactConfig;
