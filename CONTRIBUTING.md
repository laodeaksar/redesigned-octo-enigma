# Contributing Guide — My Ecommerce Monorepo

## Stack Ringkas

- **Runtime**: Bun 1.3.x + Node.js 22
- **Monorepo**: Turbo + Bun workspaces
- **Frontend**: Astro v6 (SSR) + React islands + Tailwind CSS v4
- **Backend**: Hono.js (API Gateway) + Elysia.js (microservices)
- **ORM**: Drizzle ORM (PostgreSQL)
- **Auth**: Better-auth (self-hosted)

---

## Setup Lokal

```bash
bun install                                    # install semua dependencies
cd packages/database && bun run db:migrate     # jalankan migrasi
cd packages/database && bun run db:seed        # seed data sample
bun run dev                                    # start semua service parallel via Turbo
```

Pastikan environment variables sudah di-set. Lihat `replit.md` → bagian "Required env vars".

---

## Struktur Monorepo

```
apps/
  web/              ← Astro storefront (port 5000)
  admin/            ← TanStack Start dashboard
  api-gateway/      ← Hono.js entry point (port 3000)
  auth-service/     ← Elysia.js (port 3001)
  product-service/  ← Elysia.js (port 3002)
  order-service/    ← Elysia.js (port 3003)
  payment-service/  ← Elysia.js (port 8000)
packages/
  database/         ← Drizzle schema + migrations
  common/           ← Shared Zod schemas, types, errors
  ui/               ← Shared React components (@repo/ui)
  config/env/       ← Zod-validated env configs per service
```

---

## Frontend Islands (`apps/web`)

Bagian ini adalah **aturan wajib** untuk semua kontributor yang menulis island components di `apps/web/src/components/islands/`.

Lihat detail arsitektur lengkap di [`docs/ADR-002-react-vs-solid-islands.md`](docs/ADR-002-react-vs-solid-islands.md).

### Aturan 1 — Default Framework: React

**React adalah satu-satunya framework yang diizinkan untuk islands saat ini.**

Alasan:
- `@repo/ui` 100% React (`@base-ui/react`, `lucide-react`, `embla-carousel-react`)
- Semua 25 islands yang ada sudah React
- TanStack Query v5 + TanStack Form v1 (roadmap aktif) hanya tersedia untuk React
- Menambah SolidJS pada halaman yang sudah ada React island akan **meningkatkan** bundle (tambah ~8 kb Solid runtime di atas ~46 kb React runtime yang tidak bisa dihilangkan)

```typescript
// ✓ Benar — React island
import { useState } from "react";
export default function MyIsland() { ... }

// ❌ Salah — Solid di halaman yang ada React island
import { createSignal } from "solid-js";
```

### Aturan 2 — Menambah Framework Baru Membutuhkan Approval

Siapapun yang ingin menambah `@astrojs/solid` atau framework island lain wajib:

1. Membuat PR dengan analisis bundle impact (sebelum vs sesudah, angka gzipped)
2. Membuktikan ada halaman yang bisa **100% framework baru** tanpa React island dan tanpa `@repo/ui`
3. Mendapat approval dari Principal Frontend Architect sebelum merge

### Aturan 3 — Gunakan `@repo/ui` untuk Komponen UI

Jangan membuat komponen UI custom yang sudah ada di `@repo/ui`. Komponen yang tersedia:

```typescript
// Komponen yang sudah tersedia — pakai ini, jangan buat ulang
import { Button }       from "@repo/ui/components/button";
import { Input }        from "@repo/ui/components/input";
import { Textarea }     from "@repo/ui/components/textarea";
import { Select }       from "@repo/ui/components/select";
import { Badge }        from "@repo/ui/components/badge";
import { Card }         from "@repo/ui/components/card";
import { Dialog }       from "@repo/ui/components/dialog";
import { Sheet }        from "@repo/ui/components/sheet";
import { Skeleton }     from "@repo/ui/components/skeleton";
import { Spinner }      from "@repo/ui/components/spinner";
import { Label }        from "@repo/ui/components/label";
import { Checkbox }     from "@repo/ui/components/checkbox";
import { DropdownMenu } from "@repo/ui/components/dropdown-menu";
import { Pagination }   from "@repo/ui/components/pagination";
import { Sonner }       from "@repo/ui/components/sonner"; // toast
```

### Aturan 4 — Jangan Fetch Langsung di Komponen React

```typescript
// ❌ Salah — fetch langsung di useEffect
useEffect(() => {
  fetch("/api/proxy/products").then(...);
}, []);

// ✓ Benar — via apiProxy (setelah TanStack Query migration)
import { useQuery } from "@tanstack/react-query";
import { apiProxy } from "@/lib/api";

const { data } = useQuery({
  queryKey: ["products", params],
  queryFn: () => apiProxy.get("/products", { params }),
});

// ✓ Benar sementara (pre-TanStack migration) — pakai apiProxy, bukan fetch langsung
import { apiProxy } from "@/lib/api";
const data = await apiProxy.get("/products");
```

> Lihat detail rencana migrasi TanStack Query + Form di [`TANSTACK_MIGRATION_PLAN.md`](../TANSTACK_MIGRATION_PLAN.md).

### Aturan 5 — Gunakan Schema yang Ada di `@repo/common`

Sebelum membuat validasi form manual, cek terlebih dahulu apakah schema sudah ada:

```typescript
// Schema yang sudah tersedia di @repo/common/schemas/
import { loginSchema, registerSchema, updateProfileSchema,
         createAddressSchema, updateAddressSchema }   from "@repo/common/schemas/user.schema";
import { createReviewSchema }                         from "@repo/common/schemas/product.schema";
import { validateVoucherSchema, createOrderSchema,
         cartItemSchema }                             from "@repo/common/schemas/order.schema";
```

Jika schema belum ada, **tambahkan ke `packages/common/schemas/`** terlebih dahulu, bukan buat di dalam komponen.

### Aturan 6 — Gunakan `client:` Directive yang Tepat

| Directive | Kapan Dipakai | Contoh |
|-----------|---------------|--------|
| `client:load` | Interaksi langsung saat halaman load (above-the-fold) | CartDrawer, AuthForm, AddToCartButton |
| `client:visible` | Konten below-the-fold, muncul saat scroll | ProductReviews, RecentlyViewed, OrderHistory |
| `client:idle` | Side effects atau global listeners, tidak butuh segera | TrackProductView, UndoToast, CompareBar |
| `client:only="react"` | Komponen yang tidak bisa di-SSR sama sekali (akses localStorage/window saat init) | Hindari jika bisa |

```astro
<!-- ✓ Benar — above-the-fold, butuh langsung interaktif -->
<CartDrawer client:load />

<!-- ✓ Benar — below-the-fold, hemat JS parse time -->
<ProductReviews client:visible />

<!-- ❌ Salah — client:load untuk komponen yang tidak perlu segera -->
<RecentlyViewed client:load />  <!-- seharusnya client:visible -->
```

### Aturan 7 — Budget Bundle per Halaman

Sebelum PR merge, verifikasi dengan `astro build && ls -lh dist/_astro/*.js | sort -k5 -hr`.

| Halaman | Budget JS Total (gzipped) |
|---------|--------------------------|
| `/` (homepage) | < 60 kb |
| `/products` (PLP) | < 30 kb |
| `/products/[slug]` (PDP) | < 100 kb |
| `/cart` | < 70 kb |
| `/checkout` | < 80 kb |
| `/auth/*` | < 60 kb |
| `/orders/[id]` | < 80 kb |
| `/orders/[id]/track` | < 70 kb |

### Aturan 8 — Penamaan File Island

| Tipe | Ekstensi | Lokasi |
|------|----------|--------|
| React island | `.tsx` | `apps/web/src/components/islands/` |
| Shared utility | `.ts` | `apps/web/src/lib/` atau `apps/web/src/stores/` |
| Astro layout/component | `.astro` | `apps/web/src/components/layout/` atau `shared/` |
| Halaman | `.astro` | `apps/web/src/pages/` |

---

## Backend Services

### Validasi Input

Selalu gunakan Zod schema dari `@repo/common/schemas/` untuk validasi input di service:

```typescript
import { createProductSchema } from "@repo/common/schemas/product.schema";

const body = createProductSchema.parse(await c.req.json());
```

### Environment Variables

Gunakan `@repo/env` untuk akses env vars yang sudah di-validate via Zod. Jangan akses `process.env` langsung di application code.

### Error Handling

Gunakan error classes dari `@repo/common/errors`. Jangan throw plain Error object.

---

## Database

```bash
# Generate migration dari perubahan schema
cd packages/database && bun run db:generate

# Apply migration
cd packages/database && bun run db:migrate

# Seed data
cd packages/database && bun run db:seed
```

Jangan edit file migration yang sudah ada. Buat migration baru jika perlu mengubah schema.

---

## Pull Request Checklist

Sebelum membuka PR, pastikan:

- [ ] `bun run typecheck` tidak ada error di package yang diubah
- [ ] `bun run lint` tidak ada error baru
- [ ] Island baru menggunakan React (bukan framework lain)
- [ ] Island baru menggunakan `@repo/ui` untuk komponen UI (bukan custom)
- [ ] Form validation menggunakan schema dari `@repo/common/schemas/`
- [ ] `client:` directive sesuai posisi komponen (above/below fold)
- [ ] Jika ada perubahan schema database → ada migration baru, bukan edit yang lama
- [ ] Jika menambah dependency baru → ada justifikasi di PR description
- [ ] Tidak menambah runtime baru (Deno/Node) tanpa ADR (lihat [Runtime Guardrails](#runtime-guardrails))
- [ ] Framework baru sudah diverifikasi compatible dengan `@repo/common` dan `@repo/ui`

---

## Runtime Guardrails

Aturan ini berlaku untuk **semua kontributor dan semua PR** yang menyentuh arsitektur:

### Guardrail 1 — Satu Runtime: Bun

**Dilarang menambah runtime baru (Deno, Node.js standalone, dll) tanpa ADR dan approval.**

Default seluruh monorepo adalah **Bun 1.3.x**. Ini bukan preferensi — ini constraint keras
agar `@repo/common` dan `@repo/ui` bisa di-import langsung oleh semua apps tanpa JSR,
copy-paste, atau bridging.

```
✅ Boleh:  apps/* dengan Bun runtime
❌ Dilarang: apps/anything dengan Deno runtime tanpa ADR
❌ Dilarang: apps/anything dengan standalone Node.js runtime (bukan lewat Bun compat)
```

Untuk menambah runtime baru:
1. Buat `docs/ADR-NNN-<nama>.md` dengan justifikasi teknis
2. Buktikan `@repo/common` dan `@repo/ui` tetap bisa di-import
3. Mendapat approval dari Principal Architect sebelum merge

### Guardrail 2 — Checkout di `apps/web`

**Checkout harus tetap di `apps/web` kecuali ada argumen scaling yang kuat + ADR.**

Trigger yang membenarkan isolasi checkout:
- Traffic checkout **> 50% dari total traffic storefront** secara konsisten
- Kebutuhan independent deployment cadence (tim terpisah, sprint terpisah)
- Kebutuhan scaling horizontal yang berbeda dari halaman lain

Jika trigger terpenuhi, buat `apps/checkout` sebagai **Hono+Bun** — bukan Deno/Fresh.
Alasan: satu runtime, shared `@repo/*` langsung, session + cart API yang sama.

Lihat [ADR-003](docs/ADR-003-checkout-architecture.md) untuk decision matrix lengkap.

### Guardrail 3 — Framework Wajib Compatible dengan `@repo/common` dan `@repo/ui`

Sebelum mengusulkan framework baru (island framework, SSR framework, dll):

```
Cek wajib:
1. Apakah bisa `import { Button } from "@repo/ui/components/button"` langsung? (React required)
2. Apakah bisa `import { createOrderSchema } from "@repo/common/schemas/order.schema"`?
3. Apakah runtime-nya Bun-compatible?
```

Jika jawaban salah satu adalah "tidak" → **tolak framework tersebut**. Tidak ada
pengecualian tanpa ADR yang membuktikan migration path yang konkret.

---

## ADR (Architecture Decision Records)

Keputusan arsitektur besar didokumentasikan di `docs/ADR-*.md`:

| ADR | Judul | Status |
|-----|-------|--------|
| [ADR-001](docs/ADR-001-fresh-vs-astro-checkout.md) | Fresh vs Astro untuk Checkout | Accepted (NO-GO Fresh) |
| [ADR-002](docs/ADR-002-react-vs-solid-islands.md) | React vs SolidJS untuk Astro Islands | Accepted |
| [ADR-003](docs/ADR-003-checkout-architecture.md) | Checkout Architecture: Tolak Fresh, Pilih Astro + Fallback Hono+Bun | Accepted |
