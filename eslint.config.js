import tseslint from "typescript-eslint";
import globals  from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.turbo/**",
    ],
  },
  {
    files: ["*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["scripts/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        project:         true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  }
);
