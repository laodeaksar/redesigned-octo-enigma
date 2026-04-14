# @my-ecommerce/config

Shared configuration for all apps and packages in the monorepo.

---

## Contents

| Export | File | Purpose |
|---|---|---|
| `./eslint/base` | `eslint/base.js` | TypeScript + general rules — extended by all other ESLint configs |
| `./eslint/next` | `eslint/next.js` | Next.js specific rules (apps/admin) |
| `./eslint/react` | `eslint/react.js` | React + hooks rules (apps/web, packages/ui) |
| `./eslint/node` | `eslint/node.js` | Server-side rules (all microservices) |
| `./typescript/base` | `typescript/base.json` | Strict base tsconfig |
| `./typescript/nextjs` | `typescript/nextjs.json` | Next.js tsconfig (extends base) |
| `./typescript/react-lib` | `typescript/react-lib.json` | React library tsconfig (extends base) |
| `./typescript/node` | `typescript/node.json` | Bun/Node server tsconfig (extends base) |
| `./prettier` | `prettier/index.js` | Shared Prettier config |
| `./env/server` | `env/server.js` | Zod schemas + `createEnv()` for backend services |
| `./env/client` | `env/client.js` | Zod schemas + `createClientEnv()` for frontends |

---

## Usage

### ESLint

```js
// apps/admin/eslint.config.mjs
import nextConfig from "@my-ecommerce/config/eslint/next";
export default nextConfig;

// apps/web/eslint.config.mjs
import reactConfig from "@my-ecommerce/config/eslint/react";
export default reactConfig;

// apps/api-gateway/eslint.config.mjs
import nodeConfig from "@my-ecommerce/config/eslint/node";
export default nodeConfig;
```

### TypeScript

```jsonc
// apps/admin/tsconfig.json
{ "extends": "@my-ecommerce/config/typescript/nextjs" }

// apps/web/tsconfig.json
{ "extends": "@my-ecommerce/config/typescript/react-lib" }

// apps/api-gateway/tsconfig.json
{ "extends": "@my-ecommerce/config/typescript/node" }
```

### Prettier

```js
// Any app or package — prettier.config.js
import prettierConfig from "@my-ecommerce/config/prettier";
export default prettierConfig;
```

### Environment Validation

**Backend service** — call once at startup before any imports that need env vars:

```ts
// apps/auth-service/src/env.ts
import { createEnv, authEnvSchema } from "@my-ecommerce/config/env/server";
export const env = createEnv(authEnvSchema);

// Available schemas:
// gatewayEnvSchema, authEnvSchema, productEnvSchema,
// orderEnvSchema, paymentEnvSchema, emailWorkerEnvSchema
```

**Frontend** (Next.js / TanStack Start):

```ts
// apps/web/src/env.ts
import { createClientEnv } from "@my-ecommerce/config/env/client";
export const env = createClientEnv(import.meta.env);

// apps/admin/src/env.ts
import { createClientEnv } from "@my-ecommerce/config/env/client";
export const env = createClientEnv(process.env);
```

---

## Adding a New Service

1. Add a composed schema in `env/server.js` using the existing building blocks.
2. Extend `typescript/node.json` in the service's `tsconfig.json`.
3. Extend `eslint/node.js` in the service's `eslint.config.mjs`.
4. Add a `.env.example` in the service root documenting required vars.

