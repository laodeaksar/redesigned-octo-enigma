# @my-ecommerce/config

Shared configuration untuk seluruh monorepo: TypeScript, ESLint, dan environment variables.

---

## Struktur

```
packages/config/
├── tsconfig/               # TypeScript configs per use-case
├── eslint-config/          # ESLint configs per use-case
└── env/                    # Zod-validated env per service
    └── examples/           # .env.example files
```

---

## tsconfig

| File | Digunakan oleh |
|---|---|
| `base.json` | Semua packages dan services (base) |
| `nextjs.json` | `apps/web`, `apps/admin` |
| `bundler.json` | Semua Elysia/Hono/Bun services |
| `react-library.json` | `packages/ui` |

**Cara pakai** — di `tsconfig.json` tiap app/service:

```json
{
  "extends": "@repo/tsconfig/bundler.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

---

## eslint-config

| File | Digunakan oleh |
|---|---|
| `index.js` | Semua backend services & packages |
| `next.js` | `apps/web`, `apps/admin` |
| `react-internal.js` | `packages/ui` |

**Cara pakai** — di `.eslintrc.cjs` tiap app:

```js
/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@repo/eslint-config/next"],
  parserOptions: { project: true },
};
```

---

## env

Setiap service mengimport env config-nya sendiri. Validasi dijalankan saat startup — jika ada env yang kurang atau salah format, service **langsung crash** dengan pesan yang jelas.

**Cara pakai** di dalam service:

```ts
// src/config.ts  (di dalam masing-masing service)
export { env } from "@my-ecommerce/env/order-service";

// src/index.ts
import { env } from "./config";

const app = new Elysia().listen(env.PORT);
```

**Skip validasi** (CI/CD build step tanpa env lengkap):

```bash
SKIP_ENV_VALIDATION=true bun run build
```

### Env per service

| File | Service | Port default |
|---|---|---|
| `api-gateway.ts` | `apps/api-gateway` | 3000 |
| `auth-service.ts` | `apps/auth-service` | 3001 |
| `product-service.ts` | `apps/product-service` | 3002 |
| `order-service.ts` | `apps/order-service` | 3003 |
| `payment-service.ts` | `apps/payment-service` | 3004 |
| `email-worker.ts` | `apps/email-worker` | — |
| `web.ts` | `apps/web` | 3010 |
| `admin.ts` | `apps/admin` | 3011 |

### Setup env baru

1. Copy file example yang sesuai:
   ```bash
   cp packages/config/env/examples/.env.order-service.example apps/order-service/.env
   ```
2. Isi nilai yang diperlukan
3. Jangan commit file `.env` — pastikan ada di `.gitignore`

---

## Menambahkan env var baru

1. Buka file env yang sesuai di `packages/config/env/`
2. Tambahkan field baru dengan Zod schema
3. Tambahkan ke `runtimeEnv` (khusus client-side vars di Next.js/Vite)
4. Update `.env.example` di `env/examples/`
5. Turbo akan otomatis rebuild semua dependents
