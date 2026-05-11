# TanStack Migration TODO

Checklist migrasi `apps/web` dari fetch manual + useState ke TanStack Query v5 + TanStack Form v1.

Update ✅ setiap task selesai. Commit per phase: `feat(web): phase N - <nama phase>`.

---

## Phase 1: Setup Foundation — P0

- [x] **P0** Install deps di apps/web: `@tanstack/react-query` `@tanstack/react-query-devtools` `@tanstack/react-form` `zod`
- [x] **P0** Buat `apps/web/src/lib/query-client.ts` — export `QueryClient` dengan `defaultOptions`: `staleTime 5min`, `retry 1`, `refetchOnWindowFocus false`
- [x] **P0** Buat `apps/web/src/components/providers/QueryProvider.tsx` — wrap `QueryClientProvider` + Devtools di DEV only
- [x] **P0** Buat `apps/web/src/lib/query-keys.ts` — factory: `all`, `products.list`, `products.detail`, `products.related`, `cart`, `user`, `orders.list`, `orders.detail`, `wishlist`, `reviews`
- [x] **P0** Buat `apps/web/src/lib/fetcher.ts` — generic fetcher: terima `url + ZodSchema`, return `schema.parse(envelope.data)`, throw `ApiError` kalau `!res.ok`
- [x] **P0** Upgrade Node.js ke v22 (Astro v6 requirement)
- [x] **P0** 0 TypeScript errors dari semua file TanStack baru (pre-existing errors tidak dihitung)

> **Catatan Arsitektur**: Astro island architecture membuat setiap `client:X` menjadi React root terpisah.
> QueryProvider TIDAK bisa wrap `<slot />` di BaseLayout. Solusi: setiap island yang pakai TanStack Query
> wrap diri sendiri dengan `<QueryClientProvider client={queryClient}>` menggunakan singleton `queryClient`
> → semua islands share cache yang sama via module-level singleton.

---

## Phase 2: Reusable Hooks — P0

- [x] **P0** Buat folder `apps/web/src/hooks/queries/` dan `apps/web/src/hooks/mutations/`
- [x] **P0** Buat `apps/web/src/hooks/queries/useProducts.ts` — `useQuery` + `queryKeys.products.list` + `fetcher` + `productListResponseSchema` + `initialData` param
- [x] **P0** Buat `apps/web/src/hooks/queries/useCart.ts` — `useQuery` + `queryKeys.cart()` + server fetch (when `isLoggedIn`) + nanostore sync fallback
- [x] **P0** Buat `apps/web/src/hooks/queries/useUser.ts` — `useQuery` + `queryKeys.user()` + `userSchema`
- [x] **P0** Buat `apps/web/src/hooks/mutations/useAddToCart.ts` — `useMutation` + optimistic update `onMutate`/cancel/rollback/`onSettled` invalidate cart
- [x] **P0** Buat `apps/web/src/hooks/mutations/useUpdateCartQty.ts` — sama pattern optimistic update
- [x] **P0** Buat `apps/web/src/hooks/mutations/useRemoveFromCart.ts` — sama pattern optimistic update
- [x] **P0** Buat `apps/web/src/hooks/mutations/useUpdateUser.ts` — `useMutation` + invalidate `queryKeys.user()`
- [x] **P0** Export semua return type: `export type UseXxxReturn = ReturnType<typeof useXxx>`

---

## Phase 3: Migrasi Komponen P0 — High Impact

- [x] **P0** Buat `apps/web/src/components/islands/ProductGrid.tsx` — hapus useState+useEffect manual fetch, pakai `useProducts()`, terima prop `initialProducts` dari `.astro`, pakai Skeleton untuk loading
- [x] **P0** Update `apps/web/src/pages/products/index.astro` — fetch SSR di frontmatter, pass `initialProducts` ke `ProductGrid`
- [x] **P0** Migrasi `apps/web/src/components/islands/CartDrawer.tsx` — hapus `useStore($cart)` + `useStore($cartTotal)`, ganti `useCart()` + `useUpdateCartQty()`, tetap pakai `requestRemoveFromCart` untuk UndoToast
- [x] **P0** Migrasi `apps/web/src/components/islands/UserSettingsForm.tsx` (ProfileTab) ke TanStack Form — `useForm` + per-field `safeParse` validators (Zod v4), `onSubmit` pakai mutation, error dari `field.state.meta.errors`
- [ ] **P0** Test flow: PLP load → add to cart optimistic → checkout submit → invalidate orders. Cek Devtools cache jalan

---

## Phase 4: Migrasi Komponen P1 — Important

- [ ] **P1** Migrasi SecurityTab (ChangePasswordTab) di `UserSettingsForm.tsx` ke TanStack Form + `changePasswordSchema`
- [ ] **P1** Audit semua island: ganti `client:load` jadi `client:visible` atau `client:idle` jika tidak above-the-fold
  - `RecentlyViewed` → `client:visible` ✅
  - `TrackProductView` → `client:idle` ✅
  - `OrderHistory` → `client:visible` ✅
  - `WishlistPreview` → `client:visible` ✅
- [ ] **P1** Buat `apps/web/src/hooks/queries/useRelatedProducts.ts` + migrasi related products rendering di `products/[slug].astro`
- [ ] **P1** Ganti komponen custom ke `@repo/ui` jika ada yang belum: `Button`, `Input`, `Skeleton`, `Toast`

---

## Phase 5: Docs & Guardrails — P1

- [x] **P1** Buat `docs/TANSTACK_GUIDE.md` — DO/DON'T, konvensi queryKeys, fetcher, form pattern (safeParse Zod v4)
- [x] **P1** Tambah ESLint rule di `apps/web/eslint.config.js`: `no-restricted-imports` untuk `react-query` (harus pakai `@tanstack/react-query`), `no-restricted-syntax` untuk raw `fetch(` calls di luar `src/lib/`
- [ ] **P1** Update `CONTRIBUTING.md` section TanStack: link ke `TANSTACK_GUIDE.md`
- [ ] **P1** Jalankan `bun turbo run build`. Catat bundle size sebelum/sesudah

---

## Phase 6: Validasi — P0

- [ ] **P0** Buka `ReactQueryDevtools` (bottom-left icon): balik ke PLP tidak refetch jika < 5 menit
- [ ] **P0** Test optimistic: add to cart → langsung muncul di CartDrawer, matikan network → rollback jalan
- [ ] **P0** Test form: isi nama < 2 karakter di `UserSettingsForm` → error Zod muncul per field sebelum submit
- [ ] **P0** Test SSR: `view source` di `/products` sudah ada data produk, tidak ada loading flash
- [ ] **P0** Lighthouse: LCP tidak naik, CLS tetap 0

---

## Catatan Teknis Penting

### Zod v4 API Changes
- `z.string().email()` → `z.email()` (top-level method)
- `z.string().url()` → `z.url()` (top-level method)
- `ZodError.errors` → `ZodError.issues` (array property rename)
- Error messages: `issues[0]?.message` bukan `errors[0]?.message`

### TanStack Form v1 Pattern (tanpa zodAdapter)
`@tanstack/zod-form-adapter` hanya tersedia untuk react-form v0.x. Di v1, gunakan `safeParse` langsung:
```ts
validators: {
  onChange: ({ value }) => {
    const r = mySchema.safeParse(value);
    return r.success ? undefined : r.error.issues[0]?.message;
  },
}
```

### Astro Island + QueryClient
- Setiap island **harus** wrap sendiri dengan `<QueryClientProvider client={queryClient}>`
- `queryClient` dari `@/lib/query-client` adalah singleton → semua islands share cache
- Jangan coba wrap `<slot />` di BaseLayout — tidak bisa dalam Astro architecture

---

## Laporan Progress

| Phase | useState dihapus | useQuery dibuat | useMutation dibuat |
|-------|-----------------|-----------------|-------------------|
| Phase 1 | 0 | 0 | 0 |
| Phase 2 | 0 | 3 | 4 |
| Phase 3 | CartDrawer: 3, ProductGrid: 0 (baru), UserSettings: 5 | 3 | 4 |
| Phase 4+ | — | — | — |
| **Total** | **8** | **3** | **4** |
