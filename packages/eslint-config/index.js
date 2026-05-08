// =============================================================================
// ESLint Configuration Index
// Exports all configurations as named exports
// =============================================================================

// Base configuration for JavaScript/TypeScript
import { base } from "./base.js";

// TypeScript-specific rules
import { default as typescript } from "./typescript.js";

// React-specific rules
import { default as react } from "./react.js";

// React Hooks rules
import { default as reactHooks } from "./react-hooks.js";

// Testing rules (Jest, React Testing Library)
import { default as testing } from "./testing.js";

// Tailwind CSS rules
import { default as tailwind } from "./tailwind.js";

// Combined configurations for convenience
export const reactApp = [base, typescript, react, reactHooks];
export const nodeApp = [base, typescript];
export const webApp = [base, typescript, react, reactHooks, tailwind];
export const test = [base, typescript, testing];