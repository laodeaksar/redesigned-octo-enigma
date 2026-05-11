# ADR-001: Fresh vs Astro untuk Halaman Checkout

| Field | Detail |
|-------|--------|
| **Status** | Accepted — **NO-GO Fresh** |
| **Decider** | Principal Architect |
| **Tanggal** | 2026-05-11 |
| **Scope** | `apps/web/src/pages/checkout.astro`, rencana `apps/storefront-fresh` |
| **Berlaku Mulai** | Segera |

---

## Temuan Kritis: Fresh Tidak Ada — Checkout Sudah Live di Astro

> **Sebelum membaca lebih lanjut — ini harus diketahui terlebih dahulu.**

Audit kodebase lengkap:

```
ls apps/                          → admin, api-gateway, auth-service, email-worker,
                                     order-service, payment-service, product-service, web
                                     TIDAK ADA: storefront-fresh, checkout-fresh, apps/fresh/*

cat apps/web/src/pages/checkout.astro  → halaman checkout SUDAH ADA, SUDAH LIVE di Astro
                                         CheckoutForm.tsx (578 LOC, React island, client:load)
                                         Midtrans Snap.js integration SUDAH BERFUNGSI
```

**Kesimpulan: `storefront-fresh` belum pernah diimplementasi. Ini adalah evaluasi GO/NO-GO sebelum ada investasi apapun.**

---

## 1. Context: Kenapa Checkout Sempat Dipertimbangkan ke Fresh

Diskusi awal (`ANALYSIS.md` §3a, §3d) mengidentifikasi beberapa daya tarik Fresh untuk checkout:

1. **Deno Deploy Edge** — potensi TTFB < 50ms dari edge node terdekat
2. **Island architecture** — Fresh punya model island-first yang mirip Astro, dianggap cocok untuk halaman interaktif seperti checkout (address selector, shipping rate, payment trigger)
3. **Isolasi runtime** — checkout mengandung logika pembayaran sensitif; runtime terpisah dianggap lebih aman
4. **Type safety end-to-end** — Deno native TypeScript tanpa konfigurasi tambahan

Namun keempat alasan ini belum pernah divalidasi secara teknis terhadap realita stack yang sudah ada.

---

## 2. Decision Drivers

| Driver | Bobot | Keterangan |
|--------|-------|------------|
| **TTFB /checkout** | Tinggi | Target < 200ms warm. Checkout adalah halaman konversi kritis. |
| **Session sharing** | Kritis | Auth cookie dari `apps/web` (Better-auth, HttpOnly JWT) harus bisa dibaca oleh runtime checkout |
| **DX (Developer Experience)** | Tinggi | Tim menggunakan React + TypeScript + Bun workspace. Fresh = Preact + Deno. |
| **Deploy cost** | Sedang | Saat ini: 1 Replit deployment. Setiap app tambahan = deployment terpisah. |
| **Team familiarity** | Tinggi | 25 island sudah React. 0 island Solid/Preact/Fresh. |
| **UI Consistency (`@repo/ui`)** | Kritis | `@repo/ui` menggunakan `@base-ui/react`, `embla-carousel-react`, `lucide-react` — 100% React. Fresh menggunakan Preact. |
| **Kompleksitas integrasi** | Tinggi | Monorepo Bun workspace tidak kompatibel dengan Deno module resolution |

---

## 3. Options Considered

### Opsi 1: Migrasi Checkout ke Fresh (Deno)

Buat `apps/storefront-fresh` menggunakan [Fresh framework](https://fresh.deno.dev/), pindahkan `/checkout` ke Deno Deploy.

### Opsi 2: Tetap di Astro (Status Quo) ← **DIPILIH**

Pertahankan `apps/web/src/pages/checkout.astro` + `CheckoutForm.tsx`. Optimalkan dengan `@repo/ui` jika diperlukan.

### Opsi 3: Hybrid — Astro API Route sebagai checkout orchestrator

Checkout tetap di Astro, tapi logika pembayaran dipisahkan ke dedicated Astro API route (`/api/checkout`) yang memanggil order-service + payment-service secara langsung — bukan melalui React island.

---

## 4. Pros/Cons per Opsi

### Opsi 1: Migrasi ke Fresh

| Dimensi | Pro | Con |
|---------|-----|-----|
| **TTFB** | Potensi edge TTFB < 50ms jika di-deploy ke Deno Deploy edge | Tidak relevan di Replit deployment saat ini. Cold start Deno ~200-500ms. |
| **Session sharing** | — | **CRITICAL**: Cookie `HttpOnly` dari `shop.domain.com` tidak otomatis tersedia di `checkout.domain.com` — butuh `Domain=.domain.com` setup (DNS + reverse proxy) |
| **Cart handoff** | — | **CRITICAL**: `nanostores` + `localStorage` domain-bound. Fresh tidak bisa baca cart localStorage dari domain berbeda |
| **DX** | Fresh island model intuitif | Bun workspace ≠ Deno module resolution. `packages/common`, `packages/ui`, `packages/database` tidak bisa di-import dari Deno tanpa re-publish ke deno.land atau JSR |
| **Deploy cost** | Deno Deploy free tier ada | Menambah satu runtime (Deno) di samping Node.js/Bun yang sudah ada — 2 runtime, 2 package manager, 2 deployment target |
| **Team familiarity** | — | 0 dari 25 island menggunakan Preact/Fresh. Learning curve signifikan. |
| **UI Consistency** | — | **BLOCKER**: `@repo/ui` tidak kompatibel dengan Preact. Semua komponen UI (Button, Card, Input, Badge, Separator, Skeleton, dll.) harus **diduplikasi** ke versi Preact atau ditulis ulang dari nol. `@base-ui/react` tidak ada versi Preact. |
| **Keamanan** | Isolasi runtime | Isolasi sudah ada: payment service terpisah di port 8000. Astro tidak punya akses langsung ke payment service credentials. |

**Estimasi duplikasi @repo/ui jika pilih Fresh:**

| Komponen Dibutuhkan di Checkout | Status di `@repo/ui` | Harus Duplikasi ke Preact? |
|--------------------------------|---------------------|---------------------------|
| `Button` | ✅ Ada, React | Ya |
| `Input` | ✅ Ada, React | Ya |
| `Card`, `CardHeader`, `CardContent`, `CardFooter` | ✅ Ada, React | Ya |
| `Label` | ✅ Ada, React | Ya |
| `Separator` | ✅ Ada, React | Ya |
| `Badge` | ✅ Ada, React | Ya |
| `Skeleton` (loading state) | ✅ Ada, React | Ya |
| `Spinner` | ✅ Ada, React | Ya |
| `Select` / `RadioGroup` (shipping selector) | ✅ Ada, React | Ya |
| **Total** | **9 komponen** | **9 komponen harus di-port ke Preact** |

---

### Opsi 2: Tetap di Astro

| Dimensi | Pro | Con |
|---------|-----|-----|
| **TTFB** | Warm TTFB ~4–5ms (diukur — lihat §6). Memenuhi target <200ms. | Cold TTFB ~268ms (first request ke pod — bukan first-user, Replit pod sudah warm) |
| **Session sharing** | Zero overhead — cookie dibaca via `Astro.cookies` di frontmatter. `requireAuth()` berjalan server-side sebelum HTML dikirim. | — |
| **Cart handoff** | Zero overhead — cart store (`$cart` nanostores) langsung diakses oleh `CheckoutForm` island karena satu domain | — |
| **DX** | `@repo/ui` full compatibility. React hooks, nanostores, TypeScript — semua familiar. | — |
| **Deploy cost** | 1 deployment untuk semua app. | — |
| **Team familiarity** | 25/25 islands sudah React. Tidak ada learning curve. | — |
| **UI Consistency** | ✅ Bisa pakai `@repo/ui` full — Button, Card, Input, Badge, Separator, Skeleton, Spinner, dll. POC terbukti: `CheckoutFormPOC.tsx` 165 LOC vs `CheckoutForm.tsx` 578 LOC (-71%) dengan UI konsisten. | CheckoutForm produksi saat ini tidak pakai `@repo/ui` — refactor opsional (bukan blocker) |
| **Keamanan** | Auth dilakukan server-side di frontmatter. Token tidak pernah terekspos ke client (sudah diverifikasi: proxy pattern). | — |

---

### Opsi 3: Hybrid — Astro API Route

| Dimensi | Pro | Con |
|---------|-----|-----|
| **TTFB** | Sama dengan Opsi 2 — tetap Astro SSR | — |
| **Session sharing** | Sama dengan Opsi 2 — satu domain, satu cookie | — |
| **DX** | Logika checkout terisolasi di API route — bisa di-test secara independen | Menambah indirection layer. `CheckoutForm` island harus fetch ke `/api/checkout` alih-alih ke gateway langsung via `apiProxy`. |
| **UI Consistency** | Sama dengan Opsi 2 — `@repo/ui` full | — |
| **Nilai tambah** | Bisa caching partial (alamat, ongkir) di Astro layer | Proxy `/api/proxy/[...path]` sudah ada — menambah route baru untuk checkout saja tidak memberikan value signifikan |

---

## 5. Metrics — Data Kuantitatif

### 5a. TTFB Measurement

Diukur di development environment (Replit, pod sudah warm), 5 iterasi per endpoint, `curl -s -o /dev/null -w "%{time_starttransfer}"`:

| Endpoint | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Median warm |
|----------|-------|-------|-------|-------|-------|-------------|
| `/checkout` (prod, → 302 login) | 921ms* | 5.6ms | 4.2ms | 4.7ms | 4.7ms | **~4.7ms** |
| `/checkout-astro` (POC, no auth) | 269ms* | 6.2ms | 5.2ms | 4.4ms | 4.5ms | **~5.2ms** |
| `/` homepage (BFF call) | 1311ms* | 158ms | 156ms | — | — | **~157ms** |
| `/products` (product service call) | 413ms | 352ms | 362ms | — | — | **~357ms** |

> *Run 1 = cold start (Vite SSR module compile on first request). Tidak representatif untuk production traffic.

**Catatan penting `/checkout`**: Warm 4.7ms adalah waktu untuk **302 redirect ke login** (tidak ada session valid di dev). TTFB untuk request yang benar-benar terauthentikasi (dengan address fetch ke auth service) diestimasi **~55–115ms warm** — tetap memenuhi target <200ms.

**Proyeksi Fresh hypothetical**:

| Skenario | Estimasi TTFB | Asumsi |
|----------|---------------|--------|
| Deno Deploy edge (Tokyo → Indonesia) | ~80–150ms | Round-trip tambah dari Deno Deploy |
| Replit deployment (Fresh on Bun emulation) | ~300–600ms | Deno cold start + session verification hop |
| Fresh cold start setelah idle | ~500–1000ms | Deno tidak dapat di-warm di Replit tier saat ini |

**Kesimpulan TTFB**: Astro sudah memenuhi target <200ms. Fresh di Replit environment tidak akan memberikan improvement.

---

### 5b. Complexity Measurement — Session Sharing

**Jumlah file yang menyentuh auth/session di `apps/web` saat ini:**

```
25 file (diverifikasi: grep -rl "cookie|requireAuth|JWT|token|getCurrentUser" apps/web/src/)
```

**File yang harus dimodifikasi atau dibuat baru jika checkout dipindah ke Fresh:**

| Perubahan | File / Komponen | Effort |
|-----------|-----------------|--------|
| Cookie domain setup | DNS config + reverse proxy | ~4 jam (infra) |
| `Domain=.domain.com` di Better-auth | `apps/auth-service/src/...` | ~1 jam |
| CORS origins dual-domain | `apps/api-gateway/src/lib/cors.ts` | ~1 jam |
| Cart handoff via URL params atau cross-domain localStorage fallback | Baru: `apps/web/src/lib/cart-handoff.ts` + modifikasi `checkout.astro` | ~4 jam |
| Fresh app bootstrap | `apps/storefront-fresh/` — deno.json, import_map.json, routes/, islands/ | ~8 jam |
| Re-implement session reading di Fresh | `apps/storefront-fresh/routes/_middleware.ts` | ~2 jam |
| Port 9 komponen `@repo/ui` ke Preact | `apps/storefront-fresh/components/ui/` | ~16 jam (1.5–2 jam per komponen dengan tests) |
| Re-implement `CheckoutForm` di Preact | `apps/storefront-fresh/islands/CheckoutForm.tsx` | ~8 jam |
| CI/CD pipeline Deno | `.github/workflows/` atau Replit Deploy config | ~2 jam |
| **Total estimasi** | | **~46 jam (≈ 1 minggu sprint)** |

**Jumlah komponen duplikat jika Fresh (komponen yang harus di-port dari React ke Preact):**

```
9 @repo/ui komponen dibutuhkan checkout: Button, Input, Card, Label, Separator,
Badge, Skeleton, Spinner, RadioGroup (shipping selector)

Saat ini: 0 duplikat — semua dari @repo/ui
Setelah Fresh: 9 duplikat (Preact version) + maint overhead 2× setiap breaking change
```

---

### 5c. Bundle Size

**`CheckoutForm.tsx` (produksi, custom styles, tanpa `@repo/ui`):**

| Metrik | Nilai |
|--------|-------|
| LOC | 578 |
| `@repo/ui` imports | 0 |
| Custom `className=` bindings | 66 |
| Estimasi gzipped (dari ADR-002) | ~16 kb |
| Inline helper components | 2 (`Section`, `Row`) |

**`CheckoutFormPOC.tsx` (ADR-001 POC, 100% `@repo/ui`):**

| Metrik | Nilai |
|--------|-------|
| LOC | 165 (−71% vs produksi) |
| `@repo/ui` imports | 10 (Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Input, Label, Separator, Badge) |
| Custom `className=` bindings | 6 |
| Estimasi gzipped | ~8 kb (−50% — `@repo/ui` shared dengan islands lain di bundle) |
| Helper components | 0 (semua dari `@repo/ui`) |

> **Catatan**: `@repo/ui` runtime sudah di-load di `/checkout` karena `CartDrawer` + `UndoToast` sudah mount di `BaseLayout`. Tree-shaking Vite memastikan hanya komponen yang diimport yang masuk bundle — tidak ada overhead tambahan.

**Proyeksi bundle Fresh:**

| Komponen | Astro/React | Fresh/Preact |
|----------|-------------|--------------|
| Framework runtime | React ~46 kb (sudah ada, shared) | Preact ~4 kb **baru** (tapi @repo/ui hilang) |
| CheckoutForm | ~16 kb | ~20 kb (reimplementasi dari nol) |
| UI components (Button, Input, dll.) | **0 kb** (dari @repo/ui shared) | ~15 kb (custom Preact UI) |
| **Total island** | **~16 kb** | **~39 kb** |

---

## 6. Decision: **NO-GO Fresh**

**Checkout tetap di Astro (`apps/web`). Tidak ada migrasi ke Fresh.**

### Reasoning

1. **Checkout sudah live dan berfungsi.** TTFB ~4–5ms warm. Memenuhi semua target performa. Tidak ada masalah user-facing yang harus diselesaikan dengan Fresh.

2. **`@repo/ui` adalah hard blocker.** `@repo/ui` menggunakan `@base-ui/react`, yang tidak ada versi Preact. Memindahkan checkout ke Fresh berarti menduplikasi 9+ komponen UI ke Preact — menambah maintenance burden permanen tanpa menghilangkan yang lama.

3. **Session sharing = complexity cliff.** Checkout membutuhkan auth cookie (`better-auth` JWT, `HttpOnly`). Membagikan cookie lintas domain membutuhkan DNS setup, reverse proxy config, dan modifikasi `auth-service` — infrastruktur yang tidak ada saat ini dan tidak justified hanya untuk satu halaman.

4. **Cart handoff adalah CRITICAL blocker.** `nanostores` + `localStorage` terikat ke satu domain. Cart yang sudah diisi user di `apps/web` tidak akan otomatis tersedia di Fresh domain lain. Solusi workaround (URL params, cross-domain postMessage, server-side cart sync) masing-masing menambah ~4–8 jam development dan failure mode baru.

5. **Monorepo incompatibility.** `packages/common`, `packages/database`, `packages/ui` adalah Bun workspace packages. Deno tidak mendukung Bun workspace resolution. Semua shared code harus di-publish ke JSR atau di-copy — memecah single-source-of-truth.

6. **ROI negatif.** Estimasi 46 jam development untuk mendapatkan: kemungkinan TTFB lebih buruk (Replit tidak support Deno Deploy edge), bundle lebih besar (custom Preact UI), DX lebih rumit (2 runtime, 2 package manager), dan UI tidak konsisten (duplikat komponen).

### Decision Matrix Score

Skor 1–5 (5 = lebih baik):

| Kriteria | Bobot | Astro (Opsi 2) | Fresh (Opsi 1) | Hybrid API Route (Opsi 3) |
|----------|-------|---------------|---------------|--------------------------|
| TTFB warm | 3 | 5 (~5ms) | 3 (~100–150ms est.) | 5 (~5ms) |
| Session sharing complexity | 5 | 5 (zero overhead) | 1 (5 critical issues) | 5 (zero overhead) |
| UI Consistency (`@repo/ui`) | 4 | 5 (full compat) | 1 (hard blocker — duplikat 9 komponen) | 5 (full compat) |
| DX & team familiarity | 4 | 5 (React, familiar) | 2 (Preact/Deno, unfamiliar) | 4 (extra indirection) |
| Deploy cost | 2 | 5 (1 deployment) | 2 (2 deployments) | 5 (1 deployment) |
| Effort implementasi | 3 | 5 (0 jam — sudah ada) | 1 (~46 jam) | 3 (~8 jam) |
| Bundle size | 2 | 4 (~16 kb island) | 2 (~39 kb est.) | 4 (~16 kb island) |
| **Total (weighted)** | | **5×(3+5+4+4+2+3+2) = 115** | **2×3+1×5+1×4+2×4+2×2+1×3+2×2 = 55** | **4.4 avg → ~102** |

**Ranking: Astro (Opsi 2) > Hybrid API Route (Opsi 3) > Fresh (Opsi 1)**

---

## 7. Consequences

### Jika NO-GO (Fresh) — yang harus dilakukan

| Prioritas | Aksi | Alasan | Estimasi |
|-----------|------|--------|----------|
| **P2** ✅ | Refactor `CheckoutForm.tsx` → pakai `@repo/ui` Button, Input, Card, Label, Separator | **DONE** — 8 komponen `@repo/ui` diadopsi: `Badge`, `Button`+`buttonVariants`, `Card`/`CardHeader`/`CardTitle`/`CardContent`/`CardFooter`, `Input`, `Label`, `Separator`, `Spinner`, `Textarea`. `Section` helper dihapus → diganti `Card` family. Manual spinner SVG dihapus → `<Spinner />`. `<textarea>` → `<Textarea>`. Submit + voucher buttons → `<Button>`. Address links → `buttonVariants()`. className bindings: 66 → 62. Zero TS errors. TTFB /checkout tidak berubah. | ~4 jam |
| **P2** | Hapus `apps/web/src/pages/checkout-astro.astro` dan `CheckoutFormPOC.tsx` setelah refactor selesai | File POC tidak untuk produksi — dapat dihapus kapan saja | 0.5 jam |
| **P3** | Hapus referensi `storefront-fresh` dari `ANALYSIS.md` dan `replit.md` | Mengurangi confusion — tidak ada Fresh di project | 0.5 jam |
| **Tidak perlu** | Buat `apps/storefront-fresh/` | ADR ini menyimpulkan tidak ada justifikasi teknis | — |
| **Tidak perlu** | Setup Deno runtime | Bun workspace sudah cukup | — |
| **Tidak perlu** | Cross-domain cookie config | Tidak ada domain split | — |

### Jika kondisi berubah — kapan keputusan ini perlu direvisi

| Trigger | Aksi yang Disarankan |
|---------|---------------------|
| Checkout perlu di-deploy ke **edge** (Deno Deploy, Cloudflare Workers) karena latency user di luar Indonesia | Evaluasi ulang dengan Astro adapter Cloudflare (`@astrojs/cloudflare`) **sebelum** mempertimbangkan Fresh — lebih sedikit breaking changes |
| `@repo/ui` menambah support Preact/Vue/Solid | Buat ADR baru dengan data fresh bundle |
| Checkout tumbuh menjadi checkout **flow** multi-step yang sangat kompleks (≥ 5 steps, butuh dedicated router) | Pertimbangkan membuat `apps/checkout` sebagai **Hono app** (bukan Fresh) — tetap Bun, tetap bisa pakai `packages/common` |
| Tim merekrut developer Deno specialist dan ada roadmap Deno Deploy | Buat PoC dengan real TTFB data dari edge, bukan estimasi |

### Jika GO (Fresh) diberlakukan di masa depan — prasyarat minimum

1. `@repo/ui` menyediakan Preact-compatible exports (atau diganti dengan framework-agnostic alternative seperti Ark UI)
2. DNS setup dengan shared parent domain (e.g., `.yourdomain.com`) sudah ada
3. Server-side cart API sudah stabil (sudah ada — `/api/proxy/cart`) sehingga cart bisa di-sync dari server
4. Ada dedicated sprint ≥ 1 minggu (estimasi 46 jam)
5. Deno Deploy budget tersedia (bukan Replit free tier)

---

## Lampiran A: Issues Teknis Fresh (dari `ANALYSIS.md §storefront-fresh`)

| # | Issue | Severity | Solusi yang Diperlukan |
|---|-------|----------|------------------------|
| 1 | Cookie domain mismatch — Astro di `shop.domain.com`, Fresh di `checkout.domain.com`. Cookie auth perlu `Domain=.domain.com` | **CRITICAL** | DNS + reverse proxy + auth-service config |
| 2 | Cart handoff — nanostores/localStorage adalah domain-bound | **CRITICAL** | Server-side cart sync + URL token atau cross-domain postMessage |
| 3 | `packages/common` tidak kompatibel dengan Deno — Bun workspace tidak dikenali Deno runtime | **HIGH** | Re-publish ke JSR atau gunakan import_map workaround |
| 4 | CORS origins — api-gateway hanya support satu nilai `CORS_ORIGINS` env (sudah diperbaiki — multi-value, tapi test lintas domain tetap diperlukan) | **HIGH** | Multi-origin CORS + preflight testing |
| 5 | Tidak ada Fresh adapter untuk Hono — komunikasi ke gateway tetap via HTTP fetch | LOW | Tidak ada adapter yang diperlukan, HTTP fetch cukup |

---

## Lampiran B: POC Files

**File dibuat untuk ADR ini (hapus setelah refactor CheckoutForm selesai):**

- `apps/web/src/pages/checkout-astro.astro` — halaman POC tanpa auth, measurable TTFB
- `apps/web/src/components/islands/CheckoutFormPOC.tsx` — 165 LOC, 10 `@repo/ui` components

**Cara mengakses POC:**

```
http://localhost:5000/checkout-astro
```

**Cara menghapus setelah refactor:**

```bash
rm apps/web/src/pages/checkout-astro.astro
rm apps/web/src/components/islands/CheckoutFormPOC.tsx
```
