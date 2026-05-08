# @repo/eslint-config

Comprehensive ESLint configuration for the monorepo, providing standardized linting rules for TypeScript, React, and testing environments.

## Installation

```bash
npm install --save-dev @repo/eslint-config
```

## Usage

### Base Configuration (JavaScript/TypeScript)

```javascript
// eslint.config.js
import { base } from "@repo/eslint-config";

export default [base];
```

### React Application

```javascript
// eslint.config.js
import { reactApp } from "@repo/eslint-config";

export default [reactApp];
```

### Web Application (with Tailwind CSS)

```javascript
// eslint.config.js
import { webApp } from "@repo/eslint-config";

export default [webApp];
```

### Testing Configuration

```javascript
// eslint.config.js
import { test } from "@repo/eslint-config";

export default [test];
```

## Available Configurations

| Config | Description |
|--------|-------------|
| `base` | Base rules for JavaScript/TypeScript |
| `typescript` | TypeScript-specific rules |
| `react` | React component rules |
| `reactHooks` | React Hooks rules |
| `testing` | Jest and React Testing Library rules |
| `tailwind` | Tailwind CSS class ordering rules |
| `reactApp` | Combined: base + typescript + react + reactHooks |
| `nodeApp` | Combined: base + typescript |
| `webApp` | Combined: base + typescript + react + reactHooks + tailwind |
| `test` | Combined: base + typescript + testing |

## Requirements

- ESLint v9.0.0 or higher
- TypeScript v5.0.0 or higher (for TypeScript rules)
- React v18.0.0 or higher (for React rules)
- Jest and React Testing Library (for testing rules)

## License

MIT