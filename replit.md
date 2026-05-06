# My Ecommerce

A full-stack Indonesian e-commerce platform with microservices architecture — customer storefront, admin dashboard, and backend services for auth, products, orders, and payments.

## Run & Operate

Key commands (all run from workspace root):
- `bun install` — install all workspace dependencies
- `bun run dev` — start all services in parallel via Turbo
- `cd packages/database && bun run db:migrate` — apply Drizzle migrations
- `cd packages/database && bun run db:seed` — seed sample data
- `cd packages/database && bun run db:generate` — generate new migration from schema changes

Required env vars (set in `.replit` `[userenv.shared]`):
- `DATABASE_URL` — set automatically by Replit PostgreSQL
- `JWT_SECRET`, `BETTER_AUTH_SECRET` — auth secrets (dev values pre-set)
- `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY` — payment keys (need real values for payments)
- `MONGODB_URL` — MongoDB connection (not provisioned; order persistence disabled in dev)
- `REDIS_URL` — Redis connection (not provisioned; caching/queues disabled in dev)

## Stack

- **Runtime**: Node.js 22 / Bun 1.3.x
- **Monorepo**: Turbo + Bun workspaces
- **Frontend**: Astro v6 (SSR) + React islands + Tailwind CSS v4
- **Backend**: Hono.js (API Gateway), Elysia.js (microservices)
- **ORM**: Drizzle ORM (PostgreSQL), Mongoose (MongoDB)
- **Auth**: Better-auth (self-hosted)
- **Payments**: Midtrans
- **Build**: Turbo, Vite, Bun

## Where things live

- `apps/web` — Astro customer storefront (port 5000)
- `apps/admin` — TanStack Start admin dashboard
- `apps/api-gateway` — Hono.js gateway (port 3000, entry point for all clients)
- `apps/auth-service` — Elysia.js auth service (port 3001)
- `apps/product-service` — Elysia.js product/category/review service (port 3002)
- `apps/order-service` — Elysia.js order/voucher service (port 3003)
- `apps/payment-service` — Elysia.js Midtrans payment service (port 8000)
- `apps/email-worker` — BullMQ email background worker
- `packages/database` — Drizzle schema + migrations + Mongoose models → `drizzle/schema/index.ts`
- `packages/config/env` — Zod-validated env configs per service
- `packages/common` — shared types, schemas, errors, BullMQ helpers
- `packages/ui` — shared React components (shadcn/ui)

## Architecture decisions

- All clients talk through the API Gateway (port 3000) — services are internal only
- Redis/BullMQ and MongoDB are optional in dev; services degrade gracefully without them
- Drizzle ORM uses PostgreSQL for relational data; Mongoose/MongoDB for orders only
- Better-auth is self-hosted (not a third-party SaaS) — no external auth provider needed
- Env validation via `@t3-oss/env-core` + Zod per service; `SKIP_ENV_VALIDATION=true` bypasses in dev

## Product

- Customer storefront: browse products, categories, search, cart, checkout, order tracking, wishlist
- User auth: email/password + OAuth (Google, GitHub), JWT sessions
- Admin dashboard: product/category/order/user management, analytics
- Payments: Midtrans integration (Indonesian payment gateway — bank transfer, e-wallets, credit card)
- Shipping: RajaOngkir shipping cost calculation

## User preferences

_Populate as you build_

## Gotchas

- Astro v6 requires Node.js 22+ — the project uses the `nodejs-22` module
- `DATABASE_URL` must use `postgresql://` prefix (not `postgres://`) for env validation
- Order service env had a syntax error (missing comma + `PRODUCT_SERVICE_URL`) — fixed in migration
- MongoDB and Redis are not provisioned in Replit dev env — services handle this gracefully
- BullMQ workers are disabled when Redis is unavailable

## Pointers

- DB migrations skill: `.local/skills/database/SKILL.md`
- Package management: `.local/skills/package-management/SKILL.md`
