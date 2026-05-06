# My Ecommerce — Monorepo

A full-stack e-commerce platform built as a Bun/TypeScript monorepo using Turborepo.

## Architecture

### Frontend Apps
- **`apps/web`** — Customer storefront (Astro SSR + React islands + TailwindCSS v4). Runs on port **5000**.
- **`apps/admin`** — Admin dashboard (TanStack Start + Vite + shadcn/ui). Port 3000.

### Backend Services (microservices)
- **`apps/api-gateway`** — Single entry point for all clients (Hono.js). Port 3000.
- **`apps/auth-service`** — Authentication & user management (Elysia.js + Better-auth). Port 3001.
- **`apps/product-service`** — Product catalogue, variants, stock, reviews (Elysia.js + Drizzle). Port 3002.
- **`apps/order-service`** — Order management (Elysia.js + MongoDB/Mongoose). Port 3003.
- **`apps/payment-service`** — Payment processing (Elysia.js + Midtrans). Port 3004.
- **`apps/email-worker`** — Transactional email via SMTP/Resend (BullMQ consumer).

### Shared Packages
- **`packages/config/env`** — Zod-validated env schemas for every service (`@repo/env`)
- **`packages/config/database`** — Drizzle ORM + MongoDB clients + schema (`@repo/database`)
- **`packages/common`** — Shared types, Zod schemas, BullMQ queue helpers (`@repo/common`)
- **`packages/ui`** — Shared UI components (shadcn/ui + Base UI) (`@repo/ui`)

## Tech Stack
- **Runtime**: Bun 1.3.11
- **Node.js**: v22+
- **Package Manager**: Bun workspaces + Turborepo
- **Database**: PostgreSQL (Drizzle ORM), MongoDB (Mongoose)
- **Cache/Queue**: Redis + BullMQ
- **Auth**: Better-auth + JWT
- **Payments**: Midtrans (Indonesian payment gateway)
- **Shipping**: RajaOngkir API

## Development Setup

### Running the web frontend
```bash
cd apps/web && bun run dev
```
App runs on port 5000.

### Database
The project uses Replit's built-in PostgreSQL database (`DATABASE_URL` is auto-provisioned).
Migrations are in `packages/database/drizzle/migrations/`.

To run migrations:
```bash
cd packages/database && bun run drizzle/migrate.ts
```

### Environment Variables
All environment variables are configured in Replit's secrets/env manager.
Key variables:
- `DATABASE_URL` — PostgreSQL connection string (auto-managed by Replit)
- `JWT_SECRET` — JWT signing secret (min 32 chars)
- `BETTER_AUTH_SECRET` — Better-auth secret (min 32 chars)
- `REDIS_URL` — Redis connection (for rate limiting and queues)
- `PUBLIC_API_URL` — Public API gateway URL for the web frontend

### Backend Services (require external infrastructure)
Backend services require Redis, MongoDB, and various API keys that are not available in the development environment by default. The web frontend gracefully handles API unavailability by showing empty states.

## Workflow
- **Start application**: `cd apps/web && bun run dev` — runs the storefront on port 5000

## Key Files
- `apps/web/astro.config.mjs` — Astro config (port 5000, host 0.0.0.0, allowedHosts: true)
- `packages/config/env/` — Per-service Zod env schemas
- `packages/database/drizzle/schema/` — Database schema files
- `turbo.json` — Turborepo pipeline config

## Notes
- The web frontend (Astro) handles API failures gracefully with try/catch and shows empty states
- TailwindCSS v4 is used (`@tailwindcss/vite` plugin)
- The `ProductCard.astro` component is the product display card for the storefront
