module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier" // Menonaktifkan aturan yang bentrok dengan Prettier
  ],
  plugins: ["@typescript-eslint", "import"],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    // Aturan khusus Hono/Microservices
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    
    // Memastikan urutan impor rapi
    "import/order": [
      "error",
      {
        "groups": ["builtin", "external", "internal"],
        "newlines-between": "always",
        "alphabetize": { "order": "asc", "caseInsensitive": true }
      }
    ],
    
    // Keamanan async/await
    "no-return-await": "error",
    "require-await": "error"
  },
  ignorePatterns: ["dist/", "node_modules/", "*.config.js"]
};
