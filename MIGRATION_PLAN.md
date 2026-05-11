# MIGRATION PLAN — Berdasarkan apps/web/MIGRATION_AUDIT.md
Tanggal analisa: Mon May 11 2026
Analis: Staff Frontend Engineer (read-only audit, no code changes)

---

## Catatan Penting: Koreksi Audit Awal

Audit awal (MIGRATION_AUDIT.md) dijalankan dengan `grep` pattern sederhana sehingga **menghitung semua `fetch()`** di codebase, termasuk:
- File SSR API route (`src/pages/api/...`) — fetch di sini adalah **proxy forwarding yang benar**
- `src/lib/api.ts` — ini **adalah** abstraksi fetcher, bukan anti-pattern
- `src/stores/cart.store.ts` — sebagian sudah jadi **dead code** karena mutations sudah handle sync

Setelah membaca file satu per satu, kondisi aktual berbeda signifikan dari summary audit.

---

## 1. SCOPE MIGRASI — Kondisi Aktual

### Infrastruktur: SUDAH LENGKAP ✅

| Komponen | Status | File |
|----------|--------|------|
| QueryClientProvider | ✅ Ada | `src/components/providers/QueryProvider.tsx` |
| query-keys factory | ✅ Ada | `src/lib/query-keys.ts` |
| Zod fetcher (GET/POST/PATCH) | ✅ Ada | `src/lib/fetcher.ts` |
| sonner terinstall | ✅ Ada | `package.json` v2.0.7 |
| ToastProvider island | ✅ Ada | `src/components/providers/ToastProvider.tsx` |
| notify wrapper | ✅ Ada | `src/lib/toast.ts` |

> **Kesimpulan:** Phase 0 (setup infra) sudah **selesai 100%**. Tidak perlu install deps apapun.

### Custom Hooks: SUDAH LENGKAP ✅

| Hook | Jenis | Status |
|------|-------|--------|
| `useCart` | Query | ✅ Zod schema + nanostore bridge |
| `useProducts` | Query | ✅ Zod schema + SSR initialData |
| `useUser` | Query | ✅ Zod schema + 401 retry guard |
| `useAddToCart` | Mutation | ✅ Optimistic update (cache + nanostore) |
| `useUpdateCartQty` | Mutation | ✅ Optimistic update (cache + nanostore) |
| `useRemoveFromCart` | Mutation | ✅ Ada di hooks/mutations/ |
| `useUpdateUser` | Mutation | ✅ Dipakai UserSettingsForm |

### Islands: Status Per File

| File | LOC | TanStack Query | queryFn | Query Keys | notify | Status |
|------|-----|---------------|---------|------------|--------|--------|
| `CartDrawer.tsx` | 200 | ✅ useCart + useMutation | via hook | queryKeys factory | — | ✅ DONE |
| `ProductGrid.tsx` | 171 | ✅ useProducts() | via hook | queryKeys.products.list | — | ✅ DONE |
| `CheckoutForm.tsx` | 702 | ✅ useQuery + useMutation | api.post / apiProxy | ad-hoc¹ | ✅ notify.error | ✅ DONE² |
| `OrderHistory.tsx` | 221 | ✅ useQuery | apiProxy.get | ad-hoc³ | — | ✅ DONE² |
| `UserSettingsForm.tsx` | 339 | ✅ TanStack Form v1 + useMutation | via hook | queryKeys.user | ✅ via hook | ✅ DONE |
| `ProductReviews.tsx` | 608 | ✅ useQuery + useMutation | raw fetch()⁴ | ad-hoc⁵ | ✅ notify | ⚠️ PARTIAL |
| `ComparePage.tsx` | 498 | ✅ useQueries | raw fetch()⁶ | ad-hoc | — | ⚠️ PARTIAL |
| `ProductQuickView.tsx` | 404 | ✅ useQuery | raw fetch()⁷ | ad-hoc | — | ⚠️ PARTIAL |
| `AuthForm.tsx` | 233 | ❌ useState + manual | raw fetch() | — | ❌ inline div | ❌ NOT DONE |
| `AddressManager.tsx` | 665 | ❌ useState + manual | apiProxy direct | — | ✅ notify | ❌ NOT DONE |
| `CartPage.tsx` | 415 | ❌ nanostore only | cart.store legacy | — | — | ❌ NOT DONE |
| `SearchBar.tsx` | 335 | ❌ useState + useEffect | raw fetch() | — | — | ❌ NOT DONE |
| `WishlistButton.tsx` | 102 | ❌ nanostore store | wishlist.store | — | — | ❌ NOT DONE |
| `PushNotificationManager.tsx` | 186 | ❌ manual fetch | raw fetch() | — | — | ❌ NOT DONE |

**Catatan kaki:**
1. `["shipping-rates", cityId, weight]` — belum pakai queryKeys factory, tapi tidak blocking
2. Fungsional, hanya query keys inconsistent — tidak perlu re-migrasi penuh
3. `["orders", "me", { page: 1, limit: 5 }]` — beda format dari `queryKeys.orders.list()`
4. `queryFn: () => fetch('/api/products/...').then(r => r.json())` — tidak validasi Zod
5. `["product-summary", productId]` dan `["product-reviews", productId, 1]` — belum queryKeys factory
6. `fetchDetail()` memanggil `fetch(BASE + '/products/slug/...')` langsung, bypass api client
7. `fetchProductDetail()` memanggil `fetch(BASE + '...')` langsung, bypass api client

---

## 2. PRIORITY MATRIX

| File | Issue Utama | Complexity | Priority | Est. Hours |
|------|-------------|------------|----------|------------|
| `ProductReviews.tsx` | raw fetch in queryFn, ad-hoc keys, loadMore bukan useInfiniteQuery | High (608 LOC) | P0 | 3h |
| `AuthForm.tsx` | useState + manual fetch, error inline div (no toast) | Medium (233 LOC) | P0 | 2h |
| `AddressManager.tsx` | 4 manual mutations (create/update/delete/setDefault), no invalidation | High (665 LOC) | P0 | 3h |
| `CartPage.tsx` | masih pakai cart.store legacy functions (fetchServerCart, syncCartWithServer) | High (415 LOC) | P0 | 3h |
| `ComparePage.tsx` | raw fetch() in queryFn, bypass api client | High (498 LOC) | P1 | 2h |
| `ProductQuickView.tsx` | raw fetch() in queryFn, bypass api client | High (404 LOC) | P1 | 2h |
| `WishlistButton.tsx` + `wishlist.store.ts` | store pakai raw fetch, tidak ada cache invalidation | Medium (102 + 90 LOC) | P1 | 2h |
| `SearchBar.tsx` | useEffect + manual debounce + raw fetch — bisa pakai useQuery enabled | Medium (335 LOC) | P2 | 2h |
| `PushNotificationManager.tsx` | raw fetch untuk VAPID key dan subscribe | Medium (186 LOC) | P2 | 1h |
| Query key consistency | CheckoutForm + OrderHistory pakai ad-hoc keys | Low | P2 | 1h |

**Keterangan Complexity:** Low = <50 LOC aktif, Medium = 50–200 LOC, High = >200 LOC

---

## 3. STATUS INFRASTRUKTUR

```
- [x] QueryClientProvider          → src/components/providers/QueryProvider.tsx
- [x] query-keys.ts                → src/lib/query-keys.ts (products, cart, user, orders, wishlist, reviews)
- [x] fetcher.ts                   → src/lib/fetcher.ts (fetcher, fetcherPost, fetcherPatch)
- [x] sonner installed             → "sonner": "^2.0.7" di apps/web/package.json
- [x] ToastProvider island         → src/components/providers/ToastProvider.tsx (Toaster + window.__notify)
- [x] notify wrapper               → src/lib/toast.ts (success, error, info, loading, promise, dismiss)
- [x] useQuery hooks               → src/hooks/queries/ (useCart, useProducts, useUser)
- [x] useMutation hooks            → src/hooks/mutations/ (useAddToCart, useUpdateCartQty, useRemoveFromCart, useUpdateUser)
- [x] TanStack Form v1             → UserSettingsForm sudah pakai useForm dari @tanstack/react-form
```

**Tidak ada yang perlu di-setup.** Semua fondasi sudah tersedia.

---

## 4. DEPENDENCY GRAPH

```
cart.store ($cart nanostore)
  ├── useCart()           → membaca $cart (guest) atau server (logged in), sync ke $cart
  ├── useAddToCart()      → optimistic update $cart + QueryCache[cart()]
  ├── useUpdateCartQty()  → optimistic update $cart + QueryCache[cart()]
  ├── CartDrawer.tsx      ✅ pakai useCart + useUpdateCartQty
  ├── CartPage.tsx        ❌ masih pakai cart.store directly (fetchServerCart, syncCartWithServer)
  └── CheckoutForm.tsx    ✅ pakai $cart via useStore (baca-only, ok)

ProductReviews.tsx
  ├── useQuery["product-summary"]   → harus queryKeys.reviews.forProduct()
  ├── useQuery["product-reviews"]   → harus queryKeys.reviews.forProduct()
  └── useQuery["orders","me"]       → harus queryKeys.orders.list()

wishlist.store ($wishlistedIds)
  ├── WishlistButton.tsx  ❌ pakai hydrateWishlist() + toggleWishlist() dari store
  └── WishlistPreview.tsx ← perlu dicek apakah juga terpengaruh

AddressManager.tsx
  ├── Buat → apiProxy.post langsung (harus useCreateAddress mutation)
  ├── Update → apiProxy.patch langsung (harus useUpdateAddress mutation)
  ├── Delete → apiProxy.delete langsung (harus useDeleteAddress mutation)
  └── setDefault → apiProxy.patch langsung (harus useSetDefaultAddress mutation)
  → Setelah migrasi: invalidate queryKeys.user() agar UserSettingsForm juga refresh

AuthForm.tsx
  ├── api.post("/auth/login") → mutationFn
  ├── api.post("/auth/register") → mutationFn
  └── fetch("/api/auth/session") → ini BENAR, ini endpoint SSR httpOnly cookie

CartPage.tsx → CartDrawer.tsx
  CartPage saat ini pakai fetchServerCart() + syncCartWithServer() dari cart.store
  Setelah migrasi: pakai useCart(isLoggedIn) + useUpdateCartQty + useRemoveFromCart
  CartDrawer sudah migrated, CartPage perlu ikut pattern yang sama

Urutan migrasi yang aman:
  1. ProductReviews (query only, tidak block yang lain)
  2. ComparePage + ProductQuickView (ubah fetchDetail ke api.get, tidak block yang lain)
  3. AuthForm (useMutation, tidak ada downstream)
  4. WishlistButton + wishlist.store (pindah ke useQuery, tidak block yang lain)
  5. AddressManager (4 mutations, tidak block yang lain — tapi pastikan query key konsisten dengan useUser)
  6. CartPage (terakhir karena paling banyak logic, tapi CartDrawer sudah jadi referensi)
  7. SearchBar + PushNotificationManager (independen, bisa kapan saja)
  8. Query key cleanup (CheckoutForm + OrderHistory)
```

---

## 5. RISKS

| File | Risk | Mitigasi |
|------|------|----------|
| `CartPage.tsx` | `syncCartWithServer()` melakukan merge logic yang kompleks (lokalCart + serverCart). Jika hilang saat migrasi, item cart bisa kehilangan saat login | Copy merge logic ke dalam `useCart()` hook atau `onSuccess` callback, lalu test skenario: login dengan item di localStorage |
| `ProductReviews.tsx` — `loadMore` | Paginasi manual dengan `extraReviews` state — jika diganti `useInfiniteQuery`, shape `data` berubah dan seluruh render perlu diupdate sekaligus | Migrasi atomic: ubah queryFn dulu (tanpa infinite), baru upgrade ke useInfiniteQuery di iterasi berikutnya |
| `AddressManager.tsx` | Setelah delete/create, `CheckoutForm` (halaman berbeda) masih bisa punya stale address list karena CheckoutForm menerima `addresses` sebagai SSR prop, bukan dari useQuery | Dokumentasikan bahwa CheckoutForm address list hanya refresh saat full-page navigation; atau inject queryKeys.user() ke addOnSuccess callback |
| `AuthForm.tsx` | `fetch("/api/auth/session")` adalah Astro SSR endpoint untuk set httpOnly cookie. Ini **bukan** anti-pattern dan **tidak boleh** diganti fetcher/apiProxy — tetap pakai fetch() di sini | Hanya wrap login/register API call ke useMutation; session fetch tetap raw fetch |
| `wishlist.store.ts` + `WishlistButton` | WishlistButton tidak punya QueryClientProvider — jika dimigrasi ke useQuery, harus ditambah wrapper atau disambungkan ke singleton queryClient | Pakai pola sama dengan CartDrawer: tambah QueryClientProvider client={queryClient} wrapper |
| `SearchBar.tsx` — debounce | Jika pakai useQuery dengan `enabled: query.length >= 2`, debounce perlu dihandle di luar (dengan `useDeferredValue` atau custom debounce hook) karena useQuery tidak built-in debounce | Buat `useDebouncedValue(query, 300)` hook sederhana, pakai sebagai queryKey + enabled condition |
| Query key format mismatch | `OrderHistory` pakai `["orders", "me", {...}]`, `ProductReviews` pakai `["product-reviews", productId, 1]` — saat kita `invalidateQueries(queryKeys.orders.list())`, cache OrderHistory tidak ikut ter-invalidate | Lakukan query key cleanup di fase tersendiri (Phase 3), test dengan React Query Devtools bahwa invalidation bekerja |
| Rollback cart optimistic | `useUpdateCartQty` dan `useAddToCart` sudah punya rollback ke nanostore + cache di `onError`, tapi `cart.store.ts` push helpers (pushAddToServer dll) tidak — jika server gagal, push helpers silent-fail tanpa rollback | Push helpers sudah legacy. Setelah CartPage migrasi ke hooks, push helpers di cart.store tidak dipanggil lagi dan bisa di-cleanup |

---

## 6. TIMELINE

```
Phase 0 — Setup: 0 jam (SUDAH SELESAI)
  ✅ QueryClientProvider, fetcher, query-keys, sonner, notify, hooks — semua ada

Phase 1 — P0: Fungsionalitas Broken / Missing Invalidation (~11 jam)

  1a. ProductReviews.tsx (3h)
      - Ganti raw fetch() di queryFn dengan apiProxy.get / api.get
      - Ganti ad-hoc keys ke queryKeys factory:
          ["product-summary", id] → queryKeys.reviews.forProduct(id) (atau buat reviews.summary)
          ["product-reviews", id, 1] → queryKeys.reviews.forProduct(id)
          ["orders","me","for-review"] → queryKeys.orders.list()
      - Ganti submitMutation queryFn dari raw fetch ke apiProxy.post
      - loadMore: ubah ke useInfiniteQuery (OPSIONAL, bisa defer ke P2 jika kompleks)
      - Validasi response dengan Zod schema

  1b. AuthForm.tsx (2h)
      - Wrap login + register ke useMutation
      - Ganti inline error <div> dengan notify.error (Sonner)
      - `fetch("/api/auth/session")` tetap raw fetch — ini SSR endpoint, bukan anti-pattern
      - Tambah QueryClientProvider wrapper (AuthForm saat ini tidak punya)

  1c. AddressManager.tsx (3h)
      - Buat 4 mutation hooks (atau inline useMutation):
          useCreateAddress, useUpdateAddress, useDeleteAddress, useSetDefaultAddress
      - Ganti manual state [addresses, setAddresses] dengan invalidasi queryKeys.user() atau
        queryKeys khusus addresses
      - Error sudah pakai notify — pertahankan

  1d. CartPage.tsx (3h)
      - Ganti fetchServerCart() + syncCartWithServer() dengan useCart(isLoggedIn)
      - Ganti updateQuantity() dari store dengan useUpdateCartQty()
      - Ganti clearCart() tetap dari store (ok, local only)
      - Tambah QueryClientProvider wrapper
      - Pastikan merge logic (guest cart → server) tetap berfungsi

Phase 2 — P1: Query Consistency (~6 jam)

  2a. ComparePage.tsx (2h)
      - Ganti fetchDetail() yang pakai raw fetch(BASE + ...) dengan api.get('/products/slug/...')
      - Query key bisa tetap ad-hoc atau migrasi ke queryKeys.products.detail(slug)

  2b. ProductQuickView.tsx (2h)
      - Ganti fetchProductDetail() yang pakai raw fetch(BASE + ...) dengan api.get(...)
      - Query key migrasi ke queryKeys.products.detail(slug)

  2c. WishlistButton.tsx + wishlist.store.ts (2h)
      - Buat useWishlist() query hook (ganti hydrateWishlist)
      - Buat useToggleWishlist() mutation hook (ganti toggleWishlist)
      - wishlist.store.ts: $wishlistedIds tetap sebagai derived state (computed dari query data)
        atau ganti sepenuhnya ke useQuery
      - Tambah QueryClientProvider wrapper di WishlistButton

Phase 3 — P2: Cleanup & Polish (~4 jam)

  3a. SearchBar.tsx (2h)
      - Buat useDebouncedValue(query, 300) hook
      - Ganti useEffect + manual fetch dengan useQuery:
          queryKey: queryKeys.products.search(debouncedQuery)
          enabled: debouncedQuery.length >= 2
      - Hapus manual loading/AbortController state (TanStack handle otomatis)

  3b. PushNotificationManager.tsx (1h)
      - VAPID key fetch → useQuery (public, cached)
      - Subscribe/unsubscribe → useMutation

  3c. Query key cleanup (1h)
      - CheckoutForm: ganti ["shipping-rates", cityId, weight] → tambah queryKeys.shipping
      - OrderHistory: ganti ["orders", "me", {...}] → queryKeys.orders.list()
      - ProductReviews: sudah dihandle di Phase 1

Phase 4 — Cleanup cart.store.ts (1h, SETELAH semua fase selesai)
  - Hapus pushAddToServer, pushUpdateToServer, pushRemoveFromServer, pushClearToServer
    (dead code setelah CartPage dan semua consumers migrasi ke hooks)
  - Hapus fetchServerCart() dan syncCartWithServer() (diganti useCart hook)
  - Pertahankan: $cart, $isCartOpen, $removeRequested, $cartCount, $cartTotal
    (masih dibutuhkan sebagai nanostore signal dan UI state)
  - Pertahankan: addToCart, removeFromCart, requestRemoveFromCart, clearCart, setLoggedIn
    (dipakai oleh UndoToast, ProductQuickView, AddToCartButton)

Total Estimasi: 22 jam / ~3 hari kerja
  Phase 0: 0h (done)
  Phase 1: 11h
  Phase 2: 6h
  Phase 3: 4h
  Phase 4: 1h
```

---

## 7. ROLLBACK PLAN

```bash
# Sebelum mulai: buat branch feature
git checkout -b feat/tanstack-migration

# Commit granular per file/per phase
git commit -m "refactor(web): migrate ProductReviews queryFn to apiProxy + queryKeys factory"
git commit -m "refactor(web): migrate AuthForm to useMutation + sonner"
git commit -m "refactor(web): migrate AddressManager to useMutation"
git commit -m "refactor(web): migrate CartPage to useCart + useUpdateCartQty"

# Jika satu file breaking, revert hanya file itu
git checkout main -- apps/web/src/components/islands/CartPage.tsx

# Emergency: revert seluruh phase
git revert <commit-hash>
```

**Feature flag (opsional untuk CartPage karena paling berisiko):**
```ts
// Bisa pakai env var di astro untuk A/B test
const USE_TANSTACK_CART = import.meta.env.PUBLIC_USE_TANSTACK_CART === "true";
```

---

## 8. DEFINITION OF DONE

```
Code Quality
  [ ] bun turbo run typecheck -- 0 error TypeScript
  [ ] 0 raw fetch() di src/components/islands/*.tsx (kecuali AuthForm session endpoint)
  [ ] 0 raw fetch() di src/stores/wishlist.store.ts
  [ ] cart.store.ts push helpers dihapus (Phase 4)
  [ ] Semua queryFn pakai api.get / apiProxy / fetcher — bukan bare fetch()
  [ ] Semua queryKey pakai queryKeys factory dari src/lib/query-keys.ts

UX & Feedback
  [ ] 0 inline error <div> di islands — semua error via notify.error (Sonner)
  [ ] Semua mutation success punya notify.success
  [ ] Loading state ada di semua query (skeleton atau spinner)

Performance (cek via React Query Devtools)
  [ ] Cache hit rate >80% di PLP (ProductGrid tidak refetch saat back-navigate)
  [ ] useCart tidak refetch ulang saat CartDrawer dan CartPage terbuka bersamaan
       (shared QueryClient singleton memastikan ini)
  [ ] ProductQuickView detail di-cache per slug (tidak fetch ulang kalau sudah pernah dibuka)

Tidak Boleh Turun
  [ ] Lighthouse LCP tidak naik (SSR + initialData masih berfungsi di ProductGrid)
  [ ] INP <200ms (optimistic update di cart harus tetap instant)
  [ ] Cart merge saat login tetap berfungsi (guest cart tidak hilang)
```

---

## 9. SUMMARY

Dari audit mendalam pada kondisi kode aktual (bukan output grep mentah), situasinya lebih baik dari yang terlihat di MIGRATION_AUDIT.md:

**Infrastruktur 100% siap** — QueryProvider, fetcher Zod, query-keys factory, sonner, notify wrapper, dan 7 custom hooks sudah tersedia. File P0 utama (CartDrawer, ProductGrid, CheckoutForm) sudah selesai dimigasi dengan benar termasuk optimistic update dan error handling via Sonner.

**Sisa pekerjaan nyata ada 14 file** yang terbagi menjadi tiga kategori: (1) 3 islands yang sudah pakai TanStack Query tapi queryFn-nya masih raw fetch dan query key-nya belum konsisten (ProductReviews, ComparePage, ProductQuickView — perlu 7h); (2) 4 islands yang belum migasi sama sekali — AuthForm, AddressManager, CartPage, WishlistButton + store (perlu 11h, ini P0 sebenarnya); (3) cleanup & polish — SearchBar, PushNotificationManager, dan standarisasi query key (5h).

**Risk terbesar ada di CartPage** karena `syncCartWithServer()` mengandung merge logic guest↔server yang kritis — jika hilang saat refactor, item cart bisa hilang saat login. Rekomendasi: mulai dari ProductReviews (aman, query-only), lalu AuthForm (isolated), lalu AddressManager, terakhir CartPage dengan cart merge test eksplisit. SearchBar dan PushNotificationManager bisa dikerjakan kapan saja secara paralel karena tidak ada upstream/downstream dependency.

Total estimasi: **22 jam / ~3 hari** dengan asumsi 1 engineer, tidak termasuk code review.
