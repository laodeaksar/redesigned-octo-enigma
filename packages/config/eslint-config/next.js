import base from ".";

/** @type {import("eslint").Linter.Config} */
const config = {
  ...base,
  extends: [
    ...base.extends,
    "next/core-web-vitals",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  plugins: [...(base.plugins ?? []), "react", "react-hooks"],
  parserOptions: {
    ...base.parserOptions,
    ecmaFeatures: { jsx: true },
  },
  rules: {
    ...base.rules,

    // ── React ─────────────────────────────────────────────────────────────────
    "react/react-in-jsx-scope": "off",         // not needed with new JSX transform
    "react/prop-types": "off",                 // using TypeScript for prop types
    "react/display-name": "warn",
    "react/no-unescaped-entities": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // ── Next.js ───────────────────────────────────────────────────────────────
    "@next/next/no-html-link-for-pages": "error",
    "@next/next/no-img-element": "error",
  },
  settings: {
    ...base.settings,
    react: { version: "detect" },
    next: { rootDir: ["apps/web/", "apps/admin/"] },
  },
};

export default config;
