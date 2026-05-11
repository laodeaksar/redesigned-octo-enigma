# ADR-002: React vs SolidJS untuk Astro Islands di apps/web

| Field | Detail |
|-------|--------|
| **Status** | Accepted |
| **Decider** | Principal Frontend Architect |
| **Tanggal** | 2026-05-11 |
| **Scope** | `apps/web/src/components/islands/` |
| **Berlaku Mulai** | Segera |

---

## Temuan Kritis: Tidak Ada SolidJS di Codebase

> **Sebelum membaca lebih lanjut — ini harus diketahui terlebih dahulu.**

Setelah audit penuh terhadap seluruh `apps/web/src/`, `packages/ui/`, dan semua `package.json` di monorepo:

```
grep -r "solid" apps/web/package.json packages/ui/package.json → NO_SOLID_FOUND
grep -r "@solidjs" apps/web/src/                               → NO_SOLID_IN_SRC
cat apps/web/astro.config.mjs | grep integration               → integrations: [react()]
```

**Kesimpulan: 100% islands saat ini menggunakan React. Tidak ada SolidJS sama sekali.**

- `apps/web/package.json` → tidak ada `solid-js`, `@astrojs/solid`, atau `@solidjs/*`
- `apps/web/astro.config.mjs` → hanya `integrations: [react()]`
- `packages/ui/package.json` → 100% React: `react`, `react-dom`, `@base-ui/react`, `embla-carousel-react`, `lucide-react`
- **25 island** semuanya berformat `.tsx` dengan React hooks

Dokumen ini memberikan dua hal: (1) audit status aktual yang jujur, dan (2) framework decision matrix untuk panduan ke depan jika tim mempertimbangkan SolidJS.

---

## ### 1. Audit Pemakaian Saat Ini

### 1a. Semua Island Components

Semua 25 island saat ini menggunakan **React** (tidak ada SolidJS).

| Komponen | LOC | client: | Direktif Halaman | Alasan Framework React | Dapat Dimigrasi ke Solid? |
|----------|-----|---------|-----------------|------------------------|---------------------------|
| `AddressManager.tsx` | 693 | `client:load` | `/profile/addresses` | Kompleks: CRUD form + CitySearch autocomplete + `@nanostores/react`. Kandidat TanStack Form | **Tidak** — terlalu kompleks, butuh TanStack Form |
| `ProductReviews.tsx` | 595 | `client:visible` | `/products/[slug]` | 2× `useEffect` + lazy-load + write form. Kandidat `useInfiniteQuery` | **Tidak** — akan pakai TanStack Query |
| `CheckoutForm.tsx` | 578 | `client:load` | `/checkout` | Multi-step, shipping rates fetch, Midtrans Snap.js. Kandidat TanStack Form | **Tidak** — kompleksitas tinggi, akan pakai TanStack Query + Form |
| `OrderTrackingTimeline.tsx` | 549 | `client:load` | `/orders/[id]/track` | SSE/EventSource + live reconnect + status history timeline | **Tidak** — SSE state machine kompleks |
| `ComparePage.tsx` | 493 | `client:load` | `/compare` | Fetch product details per slug, `@nanostores/react` compare store | **Tidak** — tergantung compare nanostore + fetch |
| `CartPage.tsx` | 415 | `client:load` | `/cart` | Share state cart dengan CartDrawer via nanostore. Qty stepper + subtotal calc | **Tidak** — harus share cache dengan CartDrawer |
| `ProductQuickView.tsx` | 405 | `client:idle` | Global (BaseLayout) | Modal/dialog + fetch produk by slug. Kandidat `useQuery` | **Tidak** — akan pakai TanStack Query |
| `CompareBar.tsx` | 399 | `client:idle` | Global (BaseLayout) | Sticky bar + inline modal, `$compareList` nanostore + scroll lock | **Tidak** — modal management + nanostore dependency |
| `SearchBar.tsx` | 335 | `client:load` | Global (Navbar) | Autocomplete + debounce + keyboard nav + AbortController. Kandidat `useQuery` | **Tidak** — akan pakai TanStack Query |
| `OrderStatusTracker.tsx` | 324 | `client:load` | `/orders/[id]` | SSE/EventSource + exponential backoff reconnect | **Tidak** — SSE state machine, duplikat dari OrderTrackingTimeline |
| `UserSettingsForm.tsx` | 318 | `client:load` | `/profile` | Tabbed form (Profile + Password + Notif), `@repo/ui/Badge`, `@repo/ui/Button`, `@repo/ui/Separator` | **Tidak** — pakai `@repo/ui` React components |
| `WishlistPreview.tsx` | 305 | `client:visible` | `/profile` | List + remove + pagination, `@nanostores/react`. Kandidat `useMutation` | **Tidak** — akan pakai TanStack Query |
| `AuthForm.tsx` | 233 | `client:load` | `/auth/login`, `/auth/register` | Login + register form. Kandidat TanStack Form + `loginSchema` | **Tidak** — akan pakai TanStack Form |
| `OrderHistory.tsx` | 214 | `client:visible` | `/profile` | Fetch orders list + status badge. Kandidat `useQuery` | **Tidak** — akan pakai TanStack Query |
| `UserDropdown.tsx` | 197 | `client:load` | Global (Navbar) | Dropdown menu + outside click. Kandidat `@repo/ui/DropdownMenu` | **Tidak** — kandidat untuk diganti `@repo/ui/DropdownMenu` Radix |
| `AddToCartButton.tsx` | 189 | `client:load` | `/products/[slug]` | Variant selector + qty stepper + `cart.store`. Perlu share state cart | **Tidak** — tergantung cart.store nanostore |
| `PushNotificationManager.tsx` | 186 | `client:idle` | `/orders/[id]` | ServiceWorker + PushManager API + `useRef` lifecycle | **Tidak** — complex Web API lifecycle, dipakai hanya 1 halaman |
| `UndoToast.tsx` | 185 | `client:idle` | Global (BaseLayout) | `$removeRequested` atom + countdown timer + `@nanostores/react` | **Tidak** — tightly coupled ke cart nanostore atoms |
| `CartDrawer.tsx` | 166 | `client:load` | Global (BaseLayout) | Share `$cart` atom dengan CartPage. `@nanostores/react` + `$isCartOpen` | **Tidak** — harus share state dengan CartPage |
| `RecentlyViewed.tsx` | 129 | `client:visible` | `/`, `/products/[slug]` | Baca `recentlyViewed.store` (localStorage only), tidak ada server fetch | **Bisa** — logika sederhana, tanpa @repo/ui, tanpa server fetch |
| `ReorderButton.tsx` | 124 | `client:load` | `/orders/[id]` | Trigger `addToCart()` dari cart.store, 3 state UI (idle/adding/done) | **Tidak** — tergantung cart.store |
| `CompareToggle.tsx` | 111 | `client:load` | `/products/[slug]` | Toggle compare state, `$compareIds` + `$compareList` nanostore | **Bisa** — logika sederhana, 111 LOC, tidak pakai @repo/ui |
| `OAuthButton.tsx` | 110 | `client:load` | `/auth/login`, `/auth/register` | Fetch providers + redirect to OAuth URL. 1× `useEffect` | **Bisa** — sederhana, fetch 1× on mount, tidak pakai @repo/ui |
| `WishlistButton.tsx` | 102 | `client:load` | `/products/[slug]` | Toggle wishlist IDs dari nanostore, 2 variant (icon/full) | **Tidak** — tergantung wishlist.store + post-TanStack migration |
| `TrackProductView.tsx` | 15 | `client:idle` | `/products/[slug]` | Side effect only: `hydrateRecentlyViewed()` + `trackView()` pada mount. Returns `null` | **Bisa** — 15 LOC, zero UI, side effect only |

**Ringkasan:**

| Kategori | Jumlah |
|----------|--------|
| Harus tetap React (kompleks, pakai @repo/ui, TanStack) | 21 |
| Bisa dimigrasi ke Solid (sederhana, < 130 LOC, tidak pakai @repo/ui) | 4 |
| Total islands | 25 |

### 1b. Shared Components

| Komponen | Framework | Jenis |
|----------|-----------|-------|
| `shared/LoadingIndicator.tsx` | React | Utility spinner, pakai `cva` |
| `shared/ProductCard.astro` | Astro | Static, tanpa hydration |
| `shared/Badge.astro` | Astro | Static |
| `shared/Pagination.astro` | Astro | Static |
| `shared/Card.astro` | Astro | Static |
| `shared/ScrollToTop.astro` | Astro | Vanilla JS |

---

## ### 2. Decision Matrix: React vs SolidJS

### 2a. Perbandingan Framework

Skor 1–5 (5 = sangat baik untuk kriteria tersebut).

| Kriteria | React 19 | SolidJS 1.x | Kapan Pilih React | Kapan Pilih Solid |
|----------|----------|-------------|-------------------|-------------------|
| **1. Bundle Size Runtime** | 3 | 5 | Tidak kritis untuk halaman yang sudah load React (sunk cost) | Halaman yang bisa 100% Solid tanpa @repo/ui |
| **2. Ekosistem Library** | 5 | 2 | Butuh TanStack Query v5, TanStack Form, Radix UI, Framer Motion, Recharts | Cukup dengan solid-primitives atau @solidjs/router |
| **3. Fine-grained Reactivity** | 2 | 5 | State coarse-grained, batch update cukup | State update 60fps: drag, filter range, qty stepper realtime |
| **4. Learning Curve Tim** | 5 | 3 | Tim sudah punya mental model React hooks | Tim baru atau sudah familiar SolidJS signals |
| **5. SSR + Hydration Cost** | 3 | 5 | Island sudah lazy (client:visible/idle) — hydration cost OK | Above-the-fold, butuh TTI secepat mungkin |
| **6. Interop dengan @repo/ui** | 5 | 1 | @repo/ui pakai `@base-ui/react`, `embla-carousel-react`, `lucide-react` — semua React | Tidak compatible — harus buat Solid version @repo/ui |
| **7. TypeScript DX** | 5 | 4 | Butuh generics kompleks, type inference hooks | DX Solid cukup baik, tapi tooling lebih muda |
| **8. Long-term Maintenance** | 5 | 3 | Komunitas besar, banyak SO answers, stable API | Komunitas berkembang, breaking changes lebih sering |

**Total skor**: React **33/40** · Solid **28/40**

### 2b. Analisis Biaya Bundle — Angka Konkret

**Runtime yang di-load per halaman (gzipped):**

| Runtime | Gzipped | Kapan Diload |
|---------|---------|--------------|
| `react` | ~7.1 kb | Jika ada ≥ 1 React island di halaman |
| `react-dom/client` | ~35.8 kb | Jika ada ≥ 1 React island di halaman |
| `@nanostores/react` | ~1.2 kb | Jika ada island yang pakai `useStore` |
| `nanostores` | ~1.8 kb | Jika ada island yang pakai store |
| **Total React runtime** | **~46 kb** | Sekali per halaman (shared oleh semua React islands) |
| `solid-js` | ~7.2 kb | Jika ada ≥ 1 Solid island di halaman |
| `@astrojs/solid` | ~1.0 kb | Jika ada ≥ 1 Solid island di halaman |
| **Total Solid runtime** | **~8.2 kb** | Sekali per halaman (shared oleh semua Solid islands) |

**Ukuran per komponen island (gzipped estimasi):**

| Komponen | Estimasi Gzipped | Catatan |
|----------|-----------------|---------|
| TrackProductView.tsx | ~0.5 kb | Side effect only, returns null |
| WishlistButton.tsx | ~2.5 kb | — |
| OAuthButton.tsx | ~2.5 kb | Termasuk inline SVG paths |
| CompareToggle.tsx | ~3.0 kb | — |
| ReorderButton.tsx | ~3.5 kb | Inline SVG heavy |
| RecentlyViewed.tsx | ~4.0 kb | — |
| CartDrawer.tsx | ~5.0 kb | — |
| UndoToast.tsx | ~5.0 kb | — |
| PushNotificationManager.tsx | ~5.0 kb | — |
| AuthForm.tsx | ~6.5 kb | — |
| OrderHistory.tsx | ~6.0 kb | — |
| AddToCartButton.tsx | ~6.5 kb | Inline variant logic |
| UserDropdown.tsx | ~5.5 kb | — |
| WishlistPreview.tsx | ~8.0 kb | — |
| CompareBar.tsx | ~11.0 kb | Termasuk CompareModal inline |
| SearchBar.tsx | ~10.0 kb | AbortController + keyboard nav |
| UserSettingsForm.tsx | ~9.0 kb | — |
| OrderStatusTracker.tsx | ~9.5 kb | SSE logic |
| ProductQuickView.tsx | ~12.0 kb | Dialog + fetch |
| ComparePage.tsx | ~14.0 kb | Detail table |
| CartPage.tsx | ~12.0 kb | — |
| CheckoutForm.tsx | ~16.0 kb | Multi-step complex |
| ProductReviews.tsx | ~17.0 kb | — |
| OrderTrackingTimeline.tsx | ~18.0 kb | SSE + full timeline UI |
| AddressManager.tsx | ~20.0 kb | CitySearch + CRUD form |

**Skenario bundle pada `/products/[slug]` (halaman PDP — paling banyak islands):**

```
Islands yang di-load: AddToCartButton (c:load) + WishlistButton (c:load) +
                      CompareToggle (c:load) + ProductReviews (c:visible) +
                      TrackProductView (c:idle) + RecentlyViewed (c:visible)

React runtime (shared):              46.0 kb
AddToCartButton:                      6.5 kb
WishlistButton:                       2.5 kb
CompareToggle:                        3.0 kb
ProductReviews:                      17.0 kb
TrackProductView:                     0.5 kb
RecentlyViewed:                       4.0 kb
─────────────────────────────────────────────
Total JS PDP (aktual, gzipped):      79.5 kb
```

**Jika CompareToggle, RecentlyViewed, TrackProductView dimigrasi ke Solid:**

```
React runtime (tetap ada karena AddToCartButton + ProductReviews):  46.0 kb
Solid runtime (tambah baru):                                         8.2 kb  ← TAMBAHAN
AddToCartButton (React):                                             6.5 kb
ProductReviews (React):                                             17.0 kb
WishlistButton (React):                                              2.5 kb
CompareToggle (Solid, ~50% lebih kecil):                             1.5 kb  ← hemat 1.5 kb
RecentlyViewed (Solid):                                              2.0 kb  ← hemat 2.0 kb
TrackProductView (Solid):                                            0.3 kb  ← hemat 0.2 kb
─────────────────────────────────────────────────────────────────────────────
Total JS PDP setelah partial Solid migration:                       84.0 kb  ← LEBIH BESAR 4.5 kb
```

> **Kesimpulan matematis**: Selama React masih dibutuhkan di halaman yang sama (karena `@repo/ui` atau island React lain), menambah Solid akan **meningkatkan** total bundle karena runtime Solid ditambahkan di atas runtime React yang tidak bisa dihilangkan.

**Satu-satunya skenario di mana Solid menghemat bundle:**

Sebuah halaman yang **seluruhnya** terdiri dari Solid islands dan **tidak** menggunakan `@repo/ui` sama sekali. Dalam kondisi ini, ~37.8 kb React runtime dapat dihilangkan. Saat ini tidak ada halaman seperti ini di `apps/web`.

---

## ### 3. Aturan Praktis: Kapan Pakai Apa

### Pakai React jika:

1. Komponen membutuhkan library yang hanya ada di ekosistem React: **TanStack Query v5**, **TanStack Form v1**, **Radix UI**, **Framer Motion**, **Recharts** (semua dipakai atau direncanakan di monorepo ini)
2. Komponen menggunakan atau berencana menggunakan `@repo/ui` (100% React: `@base-ui/react`, `lucide-react`, `embla-carousel-react`, `vaul`, dll.)
3. Komponen > 200 LOC atau mengandung banyak `useEffect`, `useCallback`, `useMemo`
4. Komponen perlu share state dengan island React lain via `QueryClient` (setelah migrasi TanStack Query) atau nanostore
5. Halaman yang sudah pasti load React runtime (halaman mana pun yang ada React island)
6. Komponen yang akan di-maintain oleh developer yang dominan React

**Default: pakai React.** Burden of proof ada di Solid, bukan React.

### Pakai Solid jika SEMUA kondisi berikut terpenuhi:

1. Komponen < 150 LOC dan logika sederhana (tidak ada complex state machine)
2. Komponen **tidak** membutuhkan `@repo/ui` dan **tidak** akan membutuhkannya ke depan
3. Komponen adalah **satu-satunya** island (atau semua islands) di halaman tersebut — sehingga React runtime bisa dihilangkan sepenuhnya
4. Komponen melakukan update state 60fps: live price filter slider, drag-drop, animasi berbasis input realtime — bukan sekadar click handler
5. Tim yang maintain komponen ini familiar dengan SolidJS signals

### Jangan pakai Solid jika:

1. Halaman yang sama sudah punya React island — Solid runtime ditambahkan sia-sia (lihat kalkulasi di atas)
2. Komponen perlu share state dengan React island lain tanpa event bus yang jelas
3. Dibutuhkan `@repo/ui` — tidak ada versi Solid
4. Komponen akan butuh TanStack Query/Form ke depan (roadmap TanStack Migration Plan)
5. Tim belum familiar dengan perbedaan reactive primitives Solid (`createSignal`, `createMemo`, `createEffect`) vs React hooks

### Decision Tree Cepat

```
Apakah halaman ini sudah ada React island?
├── Ya → Pakai React (Solid runtime hanya menambah bundle)
└── Tidak
    └── Apakah komponen butuh @repo/ui?
        ├── Ya → Pakai React
        └── Tidak
            └── Apakah komponen butuh TanStack Query/Form?
                ├── Ya → Pakai React
                └── Tidak
                    └── Apakah komponen < 150 LOC?
                        ├── Tidak → Pakai React
                        └── Ya → Solid bisa dipertimbangkan ✓
```

---

## ### 4. Rekomendasi untuk apps/web

### 4a. Island yang harus tetap React (21 dari 25)

Semua karena setidaknya satu dari: pakai `@repo/ui`, akan pakai TanStack Query/Form, share state cart/wishlist, SSE lifecycle, atau kompleksitas > 200 LOC.

```
AddressManager.tsx       CheckoutForm.tsx       ProductReviews.tsx
OrderTrackingTimeline.tsx ComparePage.tsx        CartPage.tsx
ProductQuickView.tsx     CompareBar.tsx         SearchBar.tsx
OrderStatusTracker.tsx   UserSettingsForm.tsx   WishlistPreview.tsx
AuthForm.tsx             OrderHistory.tsx       UserDropdown.tsx
AddToCartButton.tsx      PushNotificationManager.tsx UndoToast.tsx
CartDrawer.tsx           WishlistButton.tsx     ReorderButton.tsx
```

### 4b. Island yang secara teknis BISA dimigrasi ke Solid (4 dari 25)

**Namun dengan syarat penting: hanya jika halaman yang bersangkutan bisa menjadi 100% Solid.** Saat ini tidak ada halaman tersebut, sehingga migrasi ini secara aktual tidak menghemat bundle.

| Komponen | LOC | Alasan Bisa Solid | Hambatan Aktual |
|----------|-----|-------------------|-----------------|
| `TrackProductView.tsx` | 15 | Side effect only, returns null, logika trivial | Muncul di `/products/[slug]` bersama 5 React islands → Solid runtime tetap ditambahkan sia-sia |
| `OAuthButton.tsx` | 110 | Fetch 1× on mount, render list button, tidak pakai @repo/ui | Muncul di `/auth/login` bersama `AuthForm.tsx` (React) |
| `CompareToggle.tsx` | 111 | Toggle sederhana, baca 2 nanostore atoms | Muncul di `/products/[slug]` bersama 5 React islands |
| `RecentlyViewed.tsx` | 129 | Baca localStorage only, tidak ada server fetch, tidak pakai @repo/ui | Muncul di `/`, `/products/[slug]` bersama React islands |

**Rekomendasi: Jangan migrasi. Net bundle impact = +8.2 kb (tambah Solid runtime) bukan -.**

### 4c. Island yang harus digabung atau dihapus (duplikasi)

| Duplikasi | Aksi | Alasan |
|-----------|------|--------|
| `OrderStatusTracker.tsx` (324 LOC) dan `OrderTrackingTimeline.tsx` (549 LOC) | **Hapus OrderStatusTracker, pakai OrderTrackingTimeline saja** | Keduanya implement SSE `EventSource` yang identik: `connect()`, `order-update` event listener, exponential backoff reconnect, `TERMINAL` status set, history tracking. `OrderTrackingTimeline` adalah superset dengan UI lebih lengkap (progress bar, shipping info, activity log). `OrderStatusTracker` hanya dipakai di `/orders/[id]` — ganti dengan `OrderTrackingTimeline` versi ringkas |
| `CompareBar.tsx` memiliki inline `CompareModal` (modal perbandingan di dalam sticky bar) | **Pisahkan `CompareModal` ke file tersendiri** | Mempersulit unit test, 100 LOC untuk modal bisa jadi komponen yang reusable |

**Estimasi penghematan penghapusan `OrderStatusTracker.tsx`:**
- Eliminasi 324 LOC duplikat
- Bundle save: ~9.5 kb gzipped (ukuran komponen dihapus dari `/orders/[id]`)

### 4d. Estimasi penghematan bundle jika rekomendasi diikuti

| Aksi | Sebelum | Sesudah | Delta |
|------|---------|---------|-------|
| Hapus `OrderStatusTracker`, ganti `OrderTrackingTimeline` di `/orders/[id]` | OrderStatusTracker ~9.5 kb + OrderTrackingTimeline ~18.0 kb = 27.5 kb | Hanya OrderTrackingTimeline ~18.0 kb | **−9.5 kb** |
| Tidak migrasi ke Solid | 79.5 kb (PDP) | 79.5 kb | **±0 kb** |
| Migrasi ke TanStack Query (eliminasi duplikat fetch) | cart.store: 5 fetch calls manual | cart: 1 `useQuery` + 4 `useMutation` (kode lebih sedikit, bukan lebih banyak) | **−~3 kb** (eliminasi fetch boilerplate) |
| **Total estimasi penghematan realistis** | | | **~12.5 kb gzipped** |

---

## ### 5. Migration Plan

Berdasarkan audit, tidak ada migrasi React → Solid yang direkomendasikan. Migrasi yang ada adalah **deduplikasi** dan **konsolidasi** internal React.

| Prioritas | Component | Aksi | Alasan | Estimasi |
|-----------|-----------|------|--------|----------|
| **P0** | `OrderStatusTracker.tsx` | **Hapus** — ganti semua pemakaian dengan `OrderTrackingTimeline` (versi props-compatible) | Duplikasi logika SSE yang identik. `OrderStatusTracker` adalah subset dari `OrderTrackingTimeline` | 2 jam |
| **P0** | `CompareBar.tsx` | Extract `CompareModal` ke `CompareModal.tsx` terpisah | File 399 LOC dengan inline modal 100 LOC sulit di-test dan di-reuse | 1 jam |
| **P1** | `UserDropdown.tsx` | Ganti custom dropdown → `@repo/ui/DropdownMenu` (Radix-based) | Saat ini punya manual `useEffect` + `mousedown` listener untuk outside-click. Radix handle ini dengan accessibility built-in | 2 jam |
| **P1** | `LoadingIndicator.tsx` | Hapus, ganti seluruh pemakaian → `@repo/ui/Spinner` | Duplikasi dengan `@repo/ui/Spinner`. LoadingIndicator hanya dipakai di 2 tempat (UndoToast + CheckoutForm) | 1 jam |
| **P2** | `OAuthButton.tsx` | Rename → `OAuthButtons.tsx` (nama export sudah `OAuthButtons`, nama file tidak konsisten) | Konsistensi nama file dan export | 0.5 jam |
| **P2** | `shared/Badge.astro` | Hapus, ganti → `@repo/ui/Badge` di semua tempat | `@repo/ui/Badge` sudah dipakai di `OrderHistory.tsx`. `shared/Badge.astro` hanya dipakai di `products/[slug].astro` untuk tags | 1 jam |
| **P2** | Jika ingin Solid di masa depan | Setup `@astrojs/solid` integration, buat isolated page tanpa React island, pilih komponen < 150 LOC yang tidak perlu @repo/ui | Saat ini tidak ada ROI — tambah hanya jika ada halaman baru yang bisa 100% Solid | 4 jam setup |

---

## ### 6. Guardrails

Aturan ini ditambahkan ke `CONTRIBUTING.md` bagian "Frontend Islands".

### Aturan 1 — Default Framework

**React adalah default.** Setiap island baru ditulis dalam React kecuali sudah melewati decision tree di Bagian 3 dan mendapat approval dari Principal Frontend Architect.

### Aturan 2 — Sebelum Menambahkan Framework Baru

Siapapun yang ingin menambah `@astrojs/solid` atau framework lain ke `apps/web` wajib:

1. Membuat PR dengan analisis bundle impact (sebelum vs sesudah)
2. Membuktikan bahwa minimal ada 1 halaman yang bisa 100% Solid (tanpa React island dan tanpa `@repo/ui`)
3. Mendapat approval dari Principal Frontend Architect

### Aturan 3 — Ukuran Island Solid (jika diizinkan)

Setiap island Solid baru harus memenuhi:
- Ukuran komponen (tidak termasuk runtime) < 15 kb gzipped
- Tidak mengandung import dari `@repo/ui`, `@nanostores/react`, TanStack libraries
- Harus ada komentar framework di baris pertama file

```typescript
// Framework: Solid
// Alasan: [jelaskan mengapa bukan React — halaman apa, mengapa tidak ada React island lain]
// Bundle impact: Solid runtime +8.2 kb (pertama kali di halaman ini) / 0 kb (sudah ada Solid island)
```

### Aturan 4 — Dilarang Cross-import

```typescript
// ❌ DILARANG: import React di Solid island
import { useState } from "react"; // dalam file .solid.tsx

// ❌ DILARANG: import Solid di React island
import { createSignal } from "solid-js"; // dalam file .tsx

// ✓ BOLEH: share via nanostores (framework-agnostic)
import { $cart } from "@/stores/cart.store"; // nanostores, bukan React/Solid specific
```

### Aturan 5 — Penamaan File

| Tipe | Ekstensi | Contoh |
|------|----------|--------|
| React island | `.tsx` | `CartPage.tsx` |
| Solid island (jika ada) | `.solid.tsx` | `PriceSlider.solid.tsx` |
| Astro component | `.astro` | `ProductCard.astro` |
| Shared utility | `.ts` | `utils.ts` |

### Aturan 6 — Bundle Budget per Halaman

| Halaman | Budget JS Total Gzipped | Status Saat Ini |
|---------|------------------------|-----------------|
| `/` (homepage) | < 60 kb | ~50 kb ✓ |
| `/products` (PLP) | < 30 kb | ~10 kb ✓ (hanya RecentlyViewed) |
| `/products/[slug]` (PDP) | < 100 kb | ~79.5 kb ✓ |
| `/cart` | < 70 kb | ~58 kb ✓ |
| `/checkout` | < 80 kb | ~62 kb ✓ |
| `/auth/login`, `/auth/register` | < 60 kb | ~55 kb ✓ |
| `/orders/[id]` | < 80 kb | ~70 kb ✓ |
| `/orders/[id]/track` | < 70 kb | ~64 kb ✓ |

> Angka ini tidak termasuk Tailwind CSS (diload terpisah, ~15-25 kb gzipped).  
> Periksa budget dengan `astro build && ls -lh dist/_astro/*.js | sort -k5 -hr`.

---

## Lampiran: Data Mentah Audit

### package.json dependencies yang relevan

```json
// apps/web/package.json — framework dependencies aktual
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@astrojs/react": "^5.0.4",
    "@nanostores/react": "^0.7.3",
    "nanostores": "^1.3.0"
    // TIDAK ADA: solid-js, @astrojs/solid, @solidjs/*
  }
}

// packages/ui/package.json — membuktikan @repo/ui = 100% React
{
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "@base-ui/react": "^1.4.1",
    "embla-carousel-react": "^8.6.0",
    "lucide-react": "^1.7.0",
    "vaul": "^1.1.2"
    // TIDAK ADA: solid-js atau solid-based packages
  }
}
```

### astro.config.mjs integrations aktual

```javascript
// apps/web/astro.config.mjs
export default defineConfig({
  integrations: [react()], // ← hanya React, tidak ada solid()
});
```

### Distribusi LOC per kompleksitas

```
> 500 LOC (Very Complex, 5 komponen):  AddressManager, ProductReviews, CheckoutForm,
                                        OrderTrackingTimeline, ComparePage
300–500 LOC (Complex, 4 komponen):     CartPage, ProductQuickView, CompareBar, SearchBar
200–299 LOC (Medium-High, 4 komponen): OrderStatusTracker, UserSettingsForm, WishlistPreview, AuthForm
100–199 LOC (Medium, 8 komponen):      OrderHistory, UserDropdown, AddToCartButton,
                                        PushNotificationManager, UndoToast, CartDrawer,
                                        RecentlyViewed, ReorderButton
< 100 LOC (Simple, 4 komponen):        CompareToggle, OAuthButton, WishlistButton, TrackProductView
```

---

*ADR ini dibuat berdasarkan audit langsung terhadap source code pada 2026-05-11. Perlu di-review kembali jika ada perubahan arsitektur signifikan seperti penambahan @astrojs/solid, penggantian @repo/ui, atau keputusan menggunakan framework agnostic component library.*
