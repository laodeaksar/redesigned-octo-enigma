# Architectural Analysis — My Ecommerce Monorepo

> **Tanggal analisa:** 9 Mei 2026
> **Analis:** Senior Fullstack Architect Review
> **Scope:** `apps/web` (Astro SSR), `apps/api-gateway` (Hono.js), rencana `storefront-fresh`

---

## Catatan Penting

`storefront-fresh` **belum ada** di proyek ini. Yang ada adalah `apps/web` (Astro SSR).
Checkout sudah diimplementasi di Astro menggunakan Midtrans Snap.js sebagai React island (`CheckoutForm`).
Analisis di bawah mencerminkan kondisi aktual + rekomendasi jika Fresh ingin ditambahkan.

---

## 1. Analisa Storefront

### storefront-astro (`apps/web`)

#### Routing

File-based routing Astro sudah bersih dan well-organized:

```
/                     → index.astro              (SSR, public)
/products             → products/index.astro      (SSR, public)
/products/[slug]      → products/[slug].astro     (SSR, public)
/cart                 → cart.astro                (SSR shell, CSR content)
/checkout             → checkout.astro            (SSR, requireAuth)
/orders               → orders/index.astro
/orders/[id]          → orders/[id]/
/auth/login           → auth/login.astro
/auth/register        → auth/register.astro
/auth/callback        → auth/callback.astro       (OAuth)
/profile, /wishlist, /compare → masing-masing SSR
/api/auth/logout      → Astro API endpoint
/api/auth/session     → Astro API endpoint
```

`output: "server"` → full on-demand SSR via Bun. Tidak ada static build, semua di-render
per-request. Ini tepat untuk e-commerce (harga/stok berubah).

#### Data Fetching

Pola yang dipakai konsisten: **SSR fetch di frontmatter** → pass data ke template →
React island untuk interaktivitas.

```
Astro frontmatter
  └── api.get("/products", ...) → hit api-gateway:3000 (server-to-server)
      └── data diteruskan ke .astro template
          └── React island menerima props (addresses, token, dll)
              └── island lakukan CSR fetch untuk aksi user (add to cart, review, dll)
```

Islands yang ada:
`CheckoutForm`, `CartPage`, `AddToCartButton`, `ProductReviews`, `WishlistButton`,
`CompareBar`, `RecentlyViewed`, `TrackProductView`, `AuthForm`, `OrderHistory`,
`OrderStatusTracker`, `UserSettingsForm`, `ReorderButton`, `PushNotificationManager`

#### State Management

- **Cart**: nanostores `atom<CartItem[]>` → disimpan ke `localStorage` → di-hydrate saat island mount. Murni client-side, tidak ada server cart.
- **Auth**: JWT disimpan di cookie (HttpOnly), dibaca server-side via `getTokenFromCookies()`. Client-side tidak punya auth store (`auth.store.ts` kosong) — island menerima `token` sebagai prop dari SSR.
- **Wishlist / Compare / RecentlyViewed**: juga nanostores + localStorage.

#### Issues

| # | Issue | Severity |
|---|-------|----------|
| 1 | `PUBLIC_API_URL` dipakai server-side — SSR fetch di frontmatter seharusnya pakai internal URL (misal `http://localhost:3000`), bukan public domain | HIGH |
| 2 | Cart hanya di `localStorage` — hilang saat ganti device, incognito, atau clear storage | HIGH |
| 3 | Tipe `Product`, `Category`, `ProductDetail` didefinisikan lokal di `apps/web/src/lib/api.ts`, bukan dari `packages/common` — rawan type drift | HIGH |
| 4 | Raw JWT token diteruskan sebagai prop ke island (`<CheckoutForm token={token} />`) — JWT tidak boleh ada di client-side props | MEDIUM |
| 5 | `window.removeFromCartWithUndo` hack — cross-island communication via global window adalah anti-pattern, rawan race condition | MEDIUM |
| 6 | `web-push`, `postgres`, `drizzle-orm` di Vite SSR externals — dependency ini tidak seharusnya ada di web frontend | MEDIUM |
| 7 | Semua islands pakai `client:load` — menghapus keuntungan partial hydration Astro | LOW |

---

### storefront-fresh (Tidak Ada — Analisis Proyeksi)

**Status saat ini:** Belum diimplementasi. Checkout ada di `apps/web/src/pages/checkout.astro`
menggunakan Midtrans Snap.js sebagai island React (`CheckoutForm`).

#### Routing (proyeksi jika diimplementasi)

```
/checkout             → routes/checkout.tsx
/payment/[orderId]    → routes/payment/[orderId].tsx
/payment/success      → routes/payment/success.tsx
/payment/pending      → routes/payment/pending.tsx
```

#### Issues (jika Fresh ditambahkan)

| # | Issue | Severity |
|---|-------|----------|
| 1 | Cookie domain mismatch — Astro di `shop.domain.com`, Fresh di `checkout.domain.com`. Cookie auth perlu `Domain=.domain.com` | CRITICAL |
| 2 | Cart handoff — nanostores/localStorage adalah domain-bound, Fresh tidak bisa baca langsung | CRITICAL |
| 3 | `packages/common` tidak kompatibel dengan Deno — Bun workspace tidak dikenali Deno runtime | HIGH |
| 4 | CORS origins — api-gateway saat ini hanya support satu nilai `CORS_ORIGINS` env | HIGH |
| 5 | Tidak ada Fresh adapter untuk Hono — komunikasi ke gateway tetap via HTTP fetch | LOW |

---

## 2. TODO List 2 Minggu

| Prioritas | App | Task | Alasan |
|-----------|-----|------|--------|
| **P0** ✅ | `apps/web` | Tambah `INTERNAL_API_URL` env — pisahkan dari `PUBLIC_API_URL` untuk SSR fetch di frontmatter | **DONE** — `api.ts` sekarang pakai `import.meta.env.SSR` untuk pilih URL yang tepat; `astro.config.mjs` load + define keduanya; `.env.example` dibuat |
| **P0** ✅ | `apps/web` | Pindahkan tipe `Product`, `Category`, `ProductDetail`, `CartItem` ke `packages/common/src/types/` | **DONE** — `packages/common/types/storefront.ts` dibuat; `@repo/common` ditambah ke deps; `api.ts` pakai import + alias untuk backward compat |
| **P0** ✅ | `apps/web` | Hapus `web-push`, `postgres`, `drizzle-orm` dari Vite SSR externals | **DONE** — `ssr.external` dikosongkan; komentar menjelaskan kenapa dependency ini tidak boleh ada di frontend |
| **P0** ✅ | `api-gateway` | Dukung `CORS_ORIGINS` multi-value (comma-separated array) | **DONE** — `buildCorsOrigin()` helper di `src/lib/cors.ts`; mendukung `*` wildcard (dev) + exact allowlist (prod); default `http://localhost:5000`; `.env.example` dibuat |
| **P1** ✅ | `apps/web` | Buat server-side cart API via Astro API route + gateway `/cart` endpoint | **DONE** —Cart di localStorage hilang saat ganti device; prerequisite untuk Fresh handoff |
| **P1** ✅ | `apps/web` | Ganti `window.removeFromCartWithUndo` dengan nanostores event/atom | **DONE** — `$removeRequested` atom di `cart.store.ts`; `requestRemoveFromCart()` setter; `UndoToast` subscribe via `useStore`; zero `window.*` globals |
| **P1** ✅ | `apps/web` | Jangan pass raw `token` ke island props — buat Astro API route `/api/proxy/[...path]` sebagai authenticated fetch relay | **DONE** — `pages/api/proxy/[...path].ts` catch-all proxy dibuat; `apiProxy` client ditambah ke `api.ts`; semua 5 islands (`WishlistPreview`, `OrderHistory`, `UserSettingsForm`, `AddressManager`, `CheckoutForm`) diperbarui — token prop dihapus; 3 Astro pages diperbarui — tidak ada lagi `token={token}` di island props |
| **P1** ✅ | `apps/web` | Audit `client:load` vs `client:visible` vs `client:idle` per island | **DONE** — 9 directive diubah: `ProductQuickView`, `UndoToast`, `CompareBar` → `client:idle`; `RecentlyViewed` (index + pdp), `ProductReviews`, `OrderHistory`, `WishlistPreview` → `client:visible`; `TrackProductView`, `PushNotificationManager` → `client:idle`. Bundle JS: 738 KB (47 file). `@repo/ui` sudah dipakai di `OrderHistory` (Badge, Card, Skeleton, Separator), `WishlistPreview` (Button, Badge, Card, Skeleton, ScrollArea, Empty), `UserSettingsForm` (Button, Badge, Separator) — tidak ada duplikasi custom Button/Skeleton yang perlu dimigrasikan. `@astrojs/node` adapter ditambahkan untuk production build. |
| **P1** ✅ | `packages/common` | Buat `src/types/storefront.ts` dengan tipe yang dishare antar apps | **DONE** — `packages/common/types/storefront.ts` dibuat; `@repo/common` ditambah ke deps; `api.ts` pakai import + alias untuk backward compat |
| **P2** ✅ | `api-gateway` | Tambah BFF aggregation endpoints `/bff/home` dan `/bff/pdp/:slug` | **DONE** — `apps/api-gateway/src/modules/bff/bff.routes.ts` dibuat; `GET /bff/home` → `Promise.all(featured products + categories)`; `GET /bff/pdp/:slug` → `Promise.all(product detail + related)`; semua upstream fetch ke `SERVICES.product` (internal); Zod validation sebelum return; graceful degrade: related products 404 → empty array. `packages/common/types/bff.ts` dibuat dengan `homeBFFResponseSchema`, `pdpBFFResponseSchema`, `HomeBFFResponse`, `PDPBFFResponse` — di-export via `@repo/common/types`. `apps/web/src/lib/api.ts` ditambah `getHomeBFF()` + `getPDPBFF(slug)` dengan Zod parse. `index.astro` + `[slug].astro` diupdate pakai BFF helpers. Build `apps/web` pass clean. Curl: `/bff/home` 200 OK (5 products, 5 categories), `/bff/pdp/:slug` 200 OK (product + 5 variants). Response time tanpa cache: ~1s; dengan Redis cache HIT: **~132ms** ✅ (<200ms target tercapai). Commit basis: `e4c7426`. |
| **P2** ✅ | `api-gateway` | Cache BFF endpoints di Redis — `bff:home` TTL 60s, `bff:pdp:{slug}` TTL 30s | **DONE** — cache-aside pattern di `bff.routes.ts`: cek Redis → HIT return langsung; MISS → fetch upstream + Zod validate + tulis cache (fire-and-forget) + return. `getRedis()` dari `@/config` dipakai langsung — graceful degrade jika Redis unavailable. Header `X-Cache: HIT\|MISS` + `Cache-Control: public, max-age=N` di setiap response. Benchmark: MISS ~955ms (upstream latency dev), HIT **~132ms** — memenuhi target <200ms. Cache write failure non-fatal: `cacheSet()` catch + silent continue. |
| **P2** ✅ | `apps/web` | Tambah `<link rel="prefetch">` untuk `/checkout` saat cart tidak kosong | **DONE** — inline `<script>` di `BaseLayout.astro` dengan dua trigger: (1) page load: baca `localStorage.getItem("cart")` langsung sebelum `$cart` di-hydrate — tangkap returning users dan multi-page sessions; (2) first add-to-cart session: `$cart.subscribe()` inject link saat count 0→≥1, lalu `unsub()` (fire-once). `prefetchCheckout()` idempotent — cek `document.querySelector('link[rel="prefetch"]...')` sebelum inject. Skip jika sudah di `/checkout`. `link.as = "document"` untuk prefetch halaman penuh. Build `apps/web` pass clean. Bundle cost: nol — `$cart` sudah di-import oleh modul lain di bundle. |
| **P2** ✅ | `apps/web` | Tambah CDN domain produk ke `image.domains` di `astro.config.mjs` | **DONE** — `domains: ["localhost", "placehold.co"]` (seed data). `remotePatterns` ditambah untuk tiga S3-compatible provider: `**.amazonaws.com` (AWS S3), `**.r2.dev` (Cloudflare R2), `**.supabase.co` (Supabase Storage). `S3_PUBLIC_URL` + `S3_ENDPOINT` dibaca via `loadEnv()` di build time — jika ada, hostname-nya di-extract dengan `new URL()` dan di-push ke `remotePatterns` secara dinamis (deduplicated). Graceful: URL malformed di env di-catch dan di-skip. Pattern `**` = zero-or-more subdomain segments (Astro glob). Semua 7 checks verified via `node -e` assertion. |
| **P2** ✅ | storefront-fresh | Evaluasi apakah Fresh benar-benar diperlukan | **DONE — NO-GO Fresh.** Lihat [`docs/ADR-001-fresh-vs-astro-checkout.md`](./docs/ADR-001-fresh-vs-astro-checkout.md). Checkout sudah live di Astro, TTFB ~5ms warm. 5 blocker kritis: (1) cookie domain mismatch, (2) cart handoff localStorage domain-bound, (3) `packages/common` incompat Deno, (4) `@repo/ui` React-only — 9 komponen harus duplikasi ke Preact, (5) Bun workspace ≠ Deno module resolution. Estimasi migrasi ke Fresh: ~46 jam dengan net ROI negatif. Decision matrix: Astro 115 pts vs Fresh 55 pts. **Refactor `CheckoutForm.tsx` selesai**: 8 `@repo/ui` komponen diadopsi (`Badge`, `Button`+`buttonVariants`, `Card` family, `Input`, `Label`, `Separator`, `Spinner`, `Textarea`), `Section` helper dihapus, manual spinner SVG dihapus, className bindings 66→62, zero TS errors. POC files (`checkout-astro.astro`, `CheckoutFormPOC.tsx`) dapat dihapus kapan saja. |

---

## 3. Rekomendasi Penyesuaian

### a. Arsitektur — Apakah Hybrid Astro+Fresh Efektif?

Berdasarkan kodebase aktual: **checkout sudah berfungsi di Astro dan tidak ada alasan
teknis kuat untuk memindahkannya ke Fresh saat ini.**

Hybrid Astro+Fresh masuk akal jika:
- Checkout butuh runtime Deno-spesifik (Deno KV, Deno Deploy edge)
- Tim punya Deno expertise yang kuat
- Checkout perlu scaling independen dari storefront

Masalah nyata hybrid ini:
- Cart handoff butuh server-side cart API dulu
- Cookie domain harus diatur di level DNS (shared parent domain)
- `packages/common` harus publish ke JSR atau di-copy manual — Bun workspace tidak compatible dengan Deno

**Rekomendasi pragmatis:** Stabilkan Astro dulu (selesaikan P0/P1 di atas). Jika checkout
butuh Deno-specific feature, buat `apps/checkout` sebagai **Hono app di Bun** (bukan Fresh)
— tetap satu runtime, shared packages langsung, session via shared cookie domain.

```
Jangan:  Astro (Bun) + Fresh (Deno) = 2 runtime, 2 package manager
Lakukan: Astro (Bun) + Hono checkout (Bun) = 1 runtime, shared @repo/* packages
```

---

### b. API Gateway — Pattern Hono yang Cocok untuk BFF

Arsitektur Hono reverse proxy yang ada sudah tepat. **REST cukup**, tanpa GraphQL atau tRPC.
Yang perlu ditambah adalah **BFF aggregation layer** untuk mengurangi waterfall SSR:

```typescript
// apps/api-gateway/src/modules/bff/bff.routes.ts

// Homepage: satu request → products + categories
app.get("/bff/home", async c => {
  const [products, categories] = await Promise.all([
    fetch(`${SERVICES.product}/products?limit=8&status=active`).then(r => r.json()),
    fetch(`${SERVICES.product}/categories`).then(r => r.json()),
  ]);
  return c.json({ success: true, data: { products, categories } });
});

// PDP: satu request → product detail + reviews + related
app.get("/bff/pdp/:slug", async c => {
  const slug = c.req.param("slug");
  const [product, reviews] = await Promise.all([
    fetch(`${SERVICES.product}/products/slug/${slug}`).then(r => r.json()),
    fetch(`${SERVICES.product}/products/slug/${slug}/reviews?limit=5`).then(r => r.json()),
  ]);
  return c.json({ success: true, data: { product, reviews } });
});
```

Kenapa tidak tRPC: services adalah Elysia.js, bukan Express/Fastify — tidak ada shared
router yang bisa di-infer. Kenapa tidak GraphQL: single client (storefront), overkill.

---

### c. Data Fetching Strategy

| Skenario | Pattern | Catatan |
|----------|---------|---------|
| PLP/PDP/Homepage SSR | `fetch(INTERNAL_API_URL + path)` di frontmatter | Tidak lewat public gateway |
| Cart/Wishlist interaksi | CSR dari island → `PUBLIC_API_URL` (gateway) | Dengan Authorization header |
| Checkout form submit | CSR island → gateway `/orders` + `/payments` | Island `client:load` tepat |
| Auth check per request | Cookie verification server-side via `requireAuth()` | Sudah berjalan dengan benar |
| Data jarang berubah | Gateway cache Redis TTL 60s | Categories, shipping options |
| Recently viewed | `localStorage` + nanostores | Tetap client-side, tidak perlu server |

Jangan gunakan Astro DB (SQLite lokal) — tidak cocok untuk microservices yang sudah punya Postgres.

---

### d. Auth Flow — Session Sharing Astro ↔ Fresh

Better-auth menghasilkan JWT yang disimpan di cookie HttpOnly. Untuk sharing ke Fresh:

**Langkah yang diperlukan:**

1. Set cookie di parent domain:
   ```
   Set-Cookie: token=...; Domain=.domain.com; HttpOnly; Secure; SameSite=Lax
   ```

2. Fresh membaca cookie yang sama:
   ```typescript
   // Fresh route handler
   const cookie = req.headers.get("cookie");
   const token = parseCookie(cookie)["token"];
   const user = await verifyJWT(token, Deno.env.get("JWT_SECRET"));
   ```

3. `JWT_SECRET` dishare via env variable yang sama di kedua app.

```
Auth Service (Better-auth)
  └── Set cookie: Domain=.yourdomain.com
      ├── Astro (shop.yourdomain.com)     → baca via Astro.cookies ✓
      └── Fresh (checkout.yourdomain.com) → baca via request headers ✓
```

**Masalah dev:** Di localhost, cookie domain tidak bisa di-share cross-port. Solusi:
gunakan Docker networking atau pass token via URL param terenkripsi untuk dev environment.

---

### e. DX — Type-safe End-to-End dengan packages/common

**Kondisi saat ini:** Tipe didefinisikan per-app, tidak dishare — rawan drift.

**Target struktur:**

```
packages/common/src/
├── types/
│   ├── product.ts        # ProductDTO, CategoryDTO, ProductDetailDTO, ProductVariantDTO
│   ├── order.ts          # OrderDTO, OrderItemDTO, OrderStatusType
│   ├── user.ts           # UserDTO, AddressDTO
│   └── storefront.ts     # CartItem, WishlistItem (dishare ke web + Fresh)
├── schemas/
│   ├── product.schema.ts # Zod schemas — dipakai di services + gateway validation
│   └── order.schema.ts
└── errors/
    └── index.ts          # AppError, normalizeError (sudah ada)
```

**Di `apps/web`:**
```typescript
// Sebelum (lokal, drift-prone):
interface Product { id: string; name: string; lowestPrice: number; ... }

// Sesudah (shared, type-safe):
import type { ProductDTO } from "@repo/common/types/product";
```

**Di Elysia services:** gunakan Zod schema yang sama dari `packages/common` via
`z.infer<typeof ProductSchema>` untuk response typing.

---

### f. Deployment Strategy

| App | Platform Rekomendasi | Runtime | Alasan |
|-----|---------------------|---------|--------|
| `apps/web` (Astro SSR) | **Cloudflare Pages** + `@astrojs/cloudflare` adapter | Bun/Node | Edge SSR, cache di CDN, gratis tier generous |
| `apps/admin` (TanStack Start) | **Fly.io** atau **Railway** | Bun | Admin tidak perlu edge, butuh DB connection |
| `apps/api-gateway` (Hono) | **Fly.io** multi-region | Bun | Single entry point, perlu koneksi ke semua services |
| `apps/auth-service` (Elysia) | **Fly.io** atau **Railway** | Bun | Butuh Postgres, session management |
| `apps/product-service` (Elysia) | **Fly.io** | Bun | Butuh Postgres |
| `apps/order-service` (Elysia) | **Fly.io** | Bun | Butuh MongoDB |
| `apps/payment-service` | **Fly.io** | Bun | Koneksi ke Midtrans |
| storefront-fresh (jika dibuat) | **Deno Deploy** | Deno | Native Fresh support, edge deployment |

**Catatan Vercel:** Support Astro SSR via `@astrojs/vercel` adapter, tapi Bun runtime
harus ganti ke Node adapter dulu — tambah langkah konversi.

**Aturan paling penting untuk deployment:**
> `api-gateway` adalah **satu-satunya** service yang boleh di-expose ke public internet.
> Semua services lain harus di internal network (Fly.io private networking, Railway private
> service). Arsitektur proxy yang ada sudah enforce ini — jaga agar tidak ada service yang
> expose port publik secara tidak sengaja.

---

## Prioritas Eksekusi

Urutan yang disarankan berdasarkan impact vs effort:

```
Week 1:
  Day 1-2: P0 — INTERNAL_API_URL (kurangi TTFB langsung)
  Day 3-4: P0 — Pindahkan tipe ke packages/common
  Day 5:   P0 — Hapus SSR externals yang salah + fix CORS multi-origin

Week 2:
  Day 1-2: P1 — Server-side cart API
  Day 3:   P1 — Ganti window.removeFromCartWithUndo
  Day 4-5: P1 — Audit hydration strategy (client:load vs client:idle)
```

P2 items bisa masuk sprint berikutnya setelah baseline stabil.
