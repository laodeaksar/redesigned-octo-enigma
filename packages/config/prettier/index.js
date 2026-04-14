/**
 * Shared Prettier configuration.
 * Usage in any app/package:
 *
 *   // prettier.config.js  (or .prettierrc.js)
 *   import prettierConfig from "@my-ecommerce/config/prettier";
 *   export default prettierConfig;
 */

/** @type {import("prettier").Config} */
const prettierConfig = {
  // ── Print ─────────────────────────────────────────────────────────
  printWidth:             100,
  tabWidth:               2,
  useTabs:                false,
  semi:                   true,
  singleQuote:            false,
  quoteProps:             "as-needed",
  jsxSingleQuote:         false,

  // ── Trailing commas ────────────────────────────────────────────────
  trailingComma:          "all",   // ES5+ trailing commas everywhere

  // ── Brackets ──────────────────────────────────────────────────────
  bracketSpacing:         true,
  bracketSameLine:        false,   // JSX closing `>` on its own line
  arrowParens:            "always",

  // ── End of line ───────────────────────────────────────────────────
  endOfLine:              "lf",

  // ── Overrides ─────────────────────────────────────────────────────
  overrides: [
    {
      // JSON files — tighter columns
      files: ["*.json", "*.jsonc"],
      options: { printWidth: 80 },
    },
    {
      // Markdown — preserve line breaks
      files: ["*.md", "*.mdx"],
      options: { proseWrap: "always" },
    },
  ],
};

export default prettierConfig;
