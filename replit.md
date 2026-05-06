# My Ecommerce

Indonesian full-stack e-commerce platform (Bun/TypeScript monorepo, Turborepo) with a customer storefront, admin dashboard, and 5 microservices.

## Run & Operate

```bash
# Run migrations (must do once after fresh clone)
cd packages/database && bun run db:migrate

# Individual services (via workflows, ports set explicitly to override global PORT=3000)
cd apps/web && bun run dev                        # port 5000
cd apps/api-gateway && bun run dev                # port 3000
cd apps/auth-service && PORT=3001 bun run dev     # port 3001
cd apps/product-service && PORT=3002 bun run dev  # port 3002
cd apps/order-service && PORT=3003 bun run dev    # port 3003
cd apps/payment-service && PORT=8000 bun run dev  # port 8000
```

**Required env vars:** `DATABASE_URL` (auto-provisioned), `JWT_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:3001`

**Optional (degraded without):** `REDIS_URL` (rate limiting + cache), `MONGODB_URL` (order persistence), `RAJAONGKIR_API_KEY`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`

## Stack

- **Runtime**: Bun 1.3+ / Node.js 22
- **Monorepo**: Bun workspaces + Turborepo
- **Storefront**: Astro SSR + React islands + TailwindCSS v4
- **Admin**: TanStack Start + Vite + shadcn/ui
- **API layer**: Hono.js (api-gateway) + Elysia.js (microservices)
- **DB/ORM**: PostgreSQL + Drizzle ORM; MongoDB + Mongoose (orders)
- **Auth**: BetterAuth (self-hosted) + JWT
- **Payments**: Midtrans (Indonesian gateway)
- **Queues**: BullMQ + Redis (gracefully disabled when Redis unavailable)

## Where things live

```
apps/
  web/              Astro storefront (port 5000)
  admin/            TanStack Start admin (not in workflows)
  api-gateway/      Hono reverse proxy (port 3000)
  auth-service/     BetterAuth + JWT (port 3001)
  product-service/  Products/variants/stock (port 3002)
  order-service/    Orders/MongoDB (port 3003)
  payment-service/  Midtrans payments (port 8000)
packages/
  config/env/       Zod env schemas per service  ← source of truth for env
  database/drizzle/ Drizzle schema + migrations   ← source of truth for DB
  common/           Shared types, BullMQ helpers, error handlers
  ui/               shadcn/ui + Base UI components
```

## Architecture decisions

- **Global `PORT=3000`** is set in Replit env; each service workflow overrides with explicit `PORT=XXXX bun run dev` to avoid collision.
- **Redis/MongoDB optional**: All services start without Redis or MongoDB; BullMQ workers are stubbed, event publishers are no-ops. Production needs real Redis + MongoDB.
- **Payment service on 8000**: Remapped from original 3004 to use a Replit-supported port. `PAYMENT_SERVICE_URL=http://localhost:8000`.
- **BetterAuth (self-hosted)**: Auth is handled by the custom auth-service, not Supabase/Clerk/Firebase — no external auth replacement needed.
- **Drizzle `.using()` removed**: `ftsIdx` in `products.ts` used `.using()` which is unsupported in drizzle-orm@0.30. Commented out; use DB-level migration if FTS index needed.

## Product

- Customer storefront: product listing, product detail, cart, checkout, wishlist, order tracking
- Admin dashboard: product/order/user management
- Auth: register, login, JWT refresh, Google/GitHub OAuth (configured via env)
- Payments: Midtrans payment gateway with webhook support
- Shipping: RajaOngkir cost calculation

## User preferences

_Populate as you build_

## Gotchas

- Always run `cd packages/database && bun run db:migrate` after a fresh setup before starting services
- `PORT=XXXX` must be set explicitly in each service's workflow command (global `PORT=3000` overrides defaults)
- Redis unavailable → rate limiting disabled (gateway), cache disabled (product service), queues disabled (all services) — expected in dev
- MongoDB unavailable → order persistence disabled — expected in dev
- `SKIP_ENV_VALIDATION=true` is set globally to bypass strict env validation in dev

## Pointers

- DB schema: `packages/database/drizzle/schema/`
- Env schemas: `packages/config/env/`
- Migrations: `packages/database/drizzle/migrations/`
- Workflows skill: `.local/skills/workflows/SKILL.md`
