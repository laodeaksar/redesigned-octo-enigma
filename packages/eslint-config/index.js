// =============================================================================
// ESLint Configuration Index
// Exports all configurations as named exports
// =============================================================================

// Base configuration for JavaScript/TypeScript
export { default as base } from "./base.js";

// TypeScript-specific rules
export { default as typescript } from "./typescript.js";

// React-specific rules
export { default as react } from "./react.js";

// React Hooks rules
export { default as reactHooks } from "./react-hooks.js";

// Testing rules (Jest, React Testing Library)
export { default as testing } from "./testing.js";

// Tailwind CSS rules
export { default as tailwind } from "./tailwind.js";

// Combined configurations for convenience
export const reactApp = [base, typescript, react, reactHooks];
export const nodeApp = [base, typescript];
export const webApp = [base, typescript, react, reactHooks, tailwind];
export const test = [base, typescript, testing];