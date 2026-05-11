# ADR-003 — Checkout Architecture: Tolak Fresh, Pilih Astro + Fallback Hono+Bun

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Tanggal** | 11 Mei 2026 |
| **Penulis** | Principal Architect |
| **Supersedes** | — |
| **Terkait** | [ADR-001](./ADR-001-fresh-vs-astro-checkout.md), [ADR-002](./ADR-002-react-vs-solid-islands.md) |

---

## Konteks

Tim sebelumnya mempertimbangkan memindahkan checkout ke **Deno Fresh** karena:
- Deno Deploy dikenal dengan cold-start rendah
- Isolasi service checkout dari storefront utama
- Independensi deployment

Audit menyeluruh (lihat ADR-001) menunjukkan 5 blocker kritis dan net ROI negatif
untuk migrasi Fresh. ADR ini memformalkan keputusan arsitektur yang lebih luas:
checkout tetap di Astro, dan menetapkan jalur jika isolasi checkout benar-benar
dibutuhkan di masa depan.

### State Saat Ini (Terverifikasi — 11 Mei 2026)

| Komponen | Status | Verifikasi |
|----------|--------|------------|
| `apps/storefront-fresh` | **Tidak pernah ada** | `ls apps/storefront-fresh` → NOT_FOUND |
| `apps/web/src/pages/checkout.astro` | ✅ Live | Auth gate → SSR address fetch → Snap.js → `<CheckoutForm client:load>` |
| Server-side cart API | ✅ Done | `apps/api-gateway/src/modules/cart/cart.routes.ts` + proxy di `pages/api/proxy/[...path].ts` |
| Token prop ke island | ✅ Bersih | Grep: tidak ada `token={` di island props; `data-token` di orders/[id] adalah Midtrans payment token di `data-*` HTML attribute (bukan auth JWT) |
| `window.removeFromCartWithUndo` global | ✅ Dihapus | Diganti `$removeRequested` atom nanostores + `requestRemoveFromCart()` |
| `window.*` global tersisa | ✅ Diterima | `window.confirm()` = native browser API; `window.dispatchEvent(CustomEvent("open-quick-view"))` = cross-island event (pola yang didokumentasikan) |
| `@repo/ui` di CheckoutForm | ✅ Done | 8 komponen: Badge, Button, Card family, Input, Label, Separator, Spinner, Textarea |

---

## Keputusan

**Checkout tetap di `apps/web` (Astro SSR).**

Jika checkout perlu diisolasi untuk scaling di masa depan, buat **`apps/checkout`
sebagai Hono+Bun app** — bukan Fresh/Deno.

---

## Komparasi Opsi

| Faktor | Astro Checkout (kini) | Fresh/Deno | Hono+Bun (future split) |
|--------|-----------------------|------------|-------------------------|
| Runtime | Bun | Deno | Bun |
| Shared `@repo/*` | ✅ Langsung | ❌ Harus JSR atau duplikasi manual | ✅ Langsung |
| Session/cookie sharing | ✅ Domain sama | ❌ Butuh setup DNS + `Domain=.domain.com` | ✅ Domain sama |
| Cart handoff | ✅ `/api/proxy/cart` sudah ada | ❌ Butuh API baru lintas domain | ✅ Pakai API yang sama |
| Auth token | ✅ Better-auth cookie shared | ❌ Butuh cross-domain cookie config | ✅ Cookie shared |
| `@repo/ui` | ✅ React langsung | ❌ Preact — 9 komponen harus di-port manual | ✅ React langsung |
| Tim expertise | ✅ Sudah ada | ❌ Butuh Deno onboarding | ✅ Sama dengan services lain |
| Cold start (Replit dev) | ~5ms TTFB (warm) | N/A (tidak diimplementasi) | Estimasi setara Astro |
| Deployment target | Vercel / Cloudflare Workers | Deno Deploy (berbeda dari stack lain) | Bun deploy / container |
| Kompleksitas infra | 1 service | +1 runtime, +1 platform, +1 deployment pipeline | +1 service, 0 runtime baru |

---

## Rationale

### Mengapa TIDAK Fresh

1. **Dua runtime adalah dua ekosistem.** Bun workspace tidak dikenali Deno runtime.
   `packages/common` dan `packages/ui` tidak bisa di-import langsung — harus publish ke
   JSR atau di-copy manual. Setiap update shared package butuh sinkronisasi manual.

2. **Cart handoff lintas domain.** `localStorage` dan cookie adalah domain-bound.
   Memindahkan checkout ke subdomain berbeda butuh server-side cart sync API *dan*
   konfigurasi DNS shared parent domain — kompleksitas yang tidak ada ROI-nya sekarang.

3. **Session sharing non-trivial.** Better-auth cookie harus di-set dengan
   `Domain=.domain.com`. Butuh DNS setup dan testing di staging environment.

4. **`@repo/ui` adalah React.** `@base-ui/react`, `lucide-react`, `embla-carousel-react`
   — semua React-only. Preact compatibility layer ada, tapi belum teruji dengan
   komponen-komponen ini.

5. **Tidak ada kebutuhan Deno-spesifik.** Tidak ada Deno KV, tidak ada Deno Deploy
   edge functions, tidak ada alasan teknis yang hanya bisa dipenuhi Deno.

### Mengapa Hono+Bun jika perlu split nanti

Jika traffic checkout melebihi 50% dari total traffic dan tim membutuhkan:
- Independent deploy cadence
- Independent scaling (lebih banyak instance checkout saat sale)
- Team ownership yang terpisah

Maka `apps/checkout` sebagai **Hono+Bun** adalah pilihan tepat karena:
- Satu runtime → `@repo/*` shared langsung via Bun workspace
- Pola Hono sama dengan `apps/api-gateway` → tidak ada learning curve
- Session + cart menggunakan API yang sudah ada
- Deploy ke container / Bun runtime — infrastruktur yang sama

```
JANGAN:  apps/web (Bun) + apps/checkout (Deno) = 2 runtime, 2 pkg manager, split ekosistem
LAKUKAN: apps/web (Bun) + apps/checkout (Hono+Bun) = 1 runtime, shared @repo/*, 1 deploy pipeline
```

---

## Konsekuensi

### Konsekuensi Positif

- ✅ Checkout production-ready hari ini, tanpa migrasi
- ✅ Satu runtime (Bun) di seluruh monorepo — tidak ada Deno di production
- ✅ `@repo/ui` dan `@repo/common` tersedia langsung untuk semua apps
- ✅ Zero biaya migrasi (~46 jam migrasi Fresh dihindari)
- ✅ Team tidak perlu belajar Deno ecosystem

### Konsekuensi dan Aksi

| Prioritas | Aksi | Detail | Estimasi |
|-----------|------|--------|----------|
| **Selesai** ✅ | Tolak `apps/storefront-fresh` | Folder tidak pernah dibuat. Tidak perlu archiving. | — |
| **Selesai** ✅ | Stabilkan checkout di Astro | Semua P0/P1/P2 dari ANALYSIS.md selesai. Lihat tabel di atas. | — |
| **Guardrail** | Runtime baru butuh ADR | Siapapun ingin tambah Deno/runtime lain wajib buat ADR dulu. Lihat `CONTRIBUTING.md`. | ongoing |
| **Trigger** | Buat `apps/checkout` Hono+Bun | Hanya jika checkout traffic > 50% total ATAU butuh independent deployment | future |

---

## Migration Plan (Jika `apps/storefront-fresh` Pernah Ada)

> **Tidak berlaku saat ini** — `apps/storefront-fresh` tidak ada di repo ini.
> Seksi ini didokumentasikan sebagai referensi prosedur jika kondisi berubah.

| Step | Aksi | File Target |
|------|------|-------------|
| 1 | Audit logic unik Fresh | `docs/CHECKOUT_FRESH_AUDIT.md` |
| 2 | Port logic yang belum ada ke `apps/web` checkout | `apps/web/src/pages/checkout.astro`, `CheckoutForm.tsx` |
| 3 | Hapus folder Fresh | `rm -rf apps/storefront-fresh` |
| 4 | Bersihkan workspace config | `turbo.json`, root `package.json` — hapus entry Fresh |
| 5 | Verifikasi tidak ada referensi tersisa | `grep -r "storefront-fresh" .` → kosong |

---

## Referensi

- [ADR-001 — Fresh vs Astro Checkout (decision matrix + 5 blockers)](./ADR-001-fresh-vs-astro-checkout.md)
- [ADR-002 — React vs SolidJS untuk Astro Islands](./ADR-002-react-vs-solid-islands.md)
- [CONTRIBUTING.md — Runtime Guardrails](../CONTRIBUTING.md#runtime-guardrails)
- `apps/api-gateway/src/modules/cart/cart.routes.ts`
- `apps/web/src/pages/checkout.astro`
- `apps/web/src/components/islands/CheckoutForm.tsx`
- `apps/web/src/stores/cart.store.ts`
