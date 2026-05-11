# TanStack Migration Plan — apps/web
> Principal Frontend Architect · Audit Date: 2026-05-11

---

## ### 1. Audit Result

| Kategori | Jumlah | Detail |
|----------|--------|--------|
| **File dengan fetch manual di useEffect** | **8 island components** | OrderHistory, WishlistPreview, ProductReviews, SearchBar, ProductQuickView, AddressManager (CitySearch), CheckoutForm (fetchRates), WishlistButton (hydrateWishlist via store) |
| **File dengan fetch di Astro frontmatter** | **5 pages** | index.astro (getHomeBFF), products/index.astro, products/[slug].astro (getPDPBFF), orders/index.astro, orders/[id].astro |
| **Store dengan fetch manual** | **2 stores** | cart.store.ts (5 fetch calls), wishlist.store.ts (2 fetch calls) |
| **useState untuk menyimpan data server** | **8 komponen** | OrderHistory, WishlistPreview, ProductReviews, CheckoutForm (shippingRates, voucherResult), ProductQuickView (product), CartPage (hydrated), AddressManager (addresses), SearchBar (suggestions) |
| **Form manual tanpa Zod (meski schema tersedia)** | **5 komponen** | AuthForm, UserSettingsForm (ProfileTab), CheckoutForm, ProductReviews (write form), AddressManager (AddressForm) |
| **Komponen duplikat UI belum pakai @repo/ui** | **12 komponen** | CartPage, CartDrawer, CheckoutForm, AuthForm, SearchBar, AddressManager, ProductQuickView, ProductReviews, AddToCartButton, OrderStatusTracker, UserDropdown, RecentlyViewed |

**Total fetch manual (useEffect + store):** 15 lokasi  
**Total useState data server:** 8 komponen  
**Total form tanpa Zod:** 5 komponen

---

## ### 2. TODO List Migrasi

| Prioritas | File / Komponen | Task | Alasan | Estimasi |
|-----------|-----------------|------|--------|----------|
| **P0** | `stores/cart.store.ts` — `fetchServerCart()`, `syncCartWithServer()`, `pushAddToServer()`, `pushUpdateToServer()`, `pushRemoveFromServer()` | Ganti 5 fetch manual → `useMutation` (addToCart, updateQty, removeFromCart, clearCart, syncCart) dengan `onMutate` optimistic + `onError` rollback. Pindahkan query `cart` ke `useQuery(['cart'])` | Cart adalah data paling sering berubah; saat ini tidak ada rollback otomatis jika server gagal. Impact INP tinggi (tombol add/remove lambat terasa) | 4 jam |
| **P0** | `components/islands/CartPage.tsx` — `useEffect` + `hydrateCart()` + `syncCartWithServer()` | Ganti `useState(hydrated)` + `useEffect` → `useQuery(['cart'])` dengan `initialData` dari localStorage. Tambah `QueryClientProvider` di island wrapper | LCP: CartPage loading spinner blocking render. CLS: layout shift saat items muncul | 3 jam |
| **P0** | `components/islands/CartDrawer.tsx` | Konsumsi `useQuery(['cart'])` yang sama dari CartPage — hilangkan duplikasi state. Ganti custom `<button>` qty stepper → `@repo/ui/Button` | Cart drawer dan cart page harus terbagi satu cache. Saat ini bisa out-of-sync | 2 jam |
| **P0** | `components/islands/CheckoutForm.tsx` — `fetchRates()` di `useCallback` + `useEffect`, `handleValidateVoucher()`, `handleCheckout()` | Ganti `fetchRates` → `useQuery(['shippingRates', cityId], { enabled: !!cityId, staleTime: 10 * 60_000 })`. Ganti `handleValidateVoucher` → `useMutation`. Ganti `handleCheckout` → `useMutation(['createOrder'])` + `useMutation(['createPayment'])` | Shipping rates tidak di-cache → re-fetch setiap ganti alamat. Error state tidak di-reset konsisten | 5 jam |
| **P0** | `components/islands/CheckoutForm.tsx` — form state manual (`voucherCode`, `note`, `selectedAddress`, `selectedRate`) | Migrasi ke TanStack Form dengan adapter Zod. Gunakan `createOrderSchema` dari `@repo/common/schemas/order.schema.ts` untuk validasi `selectedAddress`, `selectedRate`, `note`. Buat `validateVoucherSchema` dari `packages/common/schemas/order.schema.ts` (sudah ada) | Form tidak punya validasi schema — bisa submit order tanpa address. Error hanya ditampilkan setelah submit (no field-level feedback) | 3 jam |
| **P0** | `components/islands/AuthForm.tsx` — `useState({ name, email, password, confirmPassword })` + manual validation | Migrasi ke TanStack Form. Gunakan `loginSchema` dan `registerSchema` dari `@repo/common/schemas/user.schema.ts` (keduanya sudah ada). Ganti custom `<input>` → `@repo/ui/Input` dan `@repo/ui/Label` | Validasi password manual (`!== confirmPassword`) tidak menggunakan `registerSchema` yang sudah ada. Field-level error tidak ditampilkan realtime | 3 jam |
| **P1** | `components/islands/OrderHistory.tsx` — `useEffect` + `apiProxy.get` + `useState<Order[]>` | Ganti → `useQuery(['orders', 'me', { page: 1, limit: 5 }])` dengan `initialData` pass dari SSR props (jika page `/profile` fetch di frontmatter). Gunakan `Skeleton` dari `@repo/ui` yang sudah ada | Setiap mount selalu re-fetch tanpa cache. `staleTime: 2 * 60_000` cukup untuk halaman profile | 2 jam |
| **P1** | `components/islands/WishlistPreview.tsx` — `useEffect` + `apiProxy.get` + `useState<WishlistItem[]>` | Ganti → `useQuery(['wishlist', { page: 1, limit: 8 }])`. Ganti `handleRemove` → `useMutation` dengan optimistic update (pattern `setQueryData` di `onMutate`, rollback di `onError`) | Saat ini optimistic remove tidak rollback jika DELETE gagal. Rollback hanya mengabaikan error | 2 jam |
| **P1** | `stores/wishlist.store.ts` — `hydrateWishlist()`, `toggleWishlist()` | Ganti store nanostore → `useQuery(['wishlist', 'ids'])` untuk hydrate IDs. Ganti `toggleWishlist` → `useMutation` dengan optimistic `Set` update. Hapus manual fetch di store | IDs wishlist disimpan di nanostore terpisah dari WishlistPreview → dua sumber kebenaran | 3 jam |
| **P1** | `components/islands/ProductReviews.tsx` — 2x `useEffect` fetch + `loadMore()` + `handleSubmit()` | Ganti fetch summary → `useQuery(['reviews', 'summary', productId])`. Ganti fetch reviews → `useInfiniteQuery(['reviews', productId])` untuk "Muat Lebih Banyak". Ganti `handleSubmit` → `useMutation` yang `invalidateQueries(['reviews'])` setelah sukses | Saat ini setelah submit review, re-fetch dilakukan manual dengan 2 fetch terpisah. `useInfiniteQuery` eliminasi `page` state manual | 4 jam |
| **P1** | `components/islands/ProductReviews.tsx` — write form (`rating`, `title`, `body`, `orderId`) | Migrasi ke TanStack Form. Gunakan `createReviewSchema` dari `@repo/common/schemas/product.schema.ts` (sudah ada). Error `rating === 0` harus jadi field-level error, bukan hanya button disable | Schema tersedia tapi tidak dipakai. Validasi hanya di `handleSubmit` — tidak ada feedback realtime | 2 jam |
| **P1** | `components/islands/UserSettingsForm.tsx` — `ProfileTab`: `useState(name)`, `useState(avatarUrl)` + manual `dirty` check | Migrasi ke TanStack Form dengan `updateProfileSchema` dari `@repo/common/schemas/user.schema.ts` (sudah ada). Ganti `dirty` check manual → `form.state.isDirty`. Ganti custom `<input>` → `@repo/ui/Input` | Form tidak punya validasi `avatarUrl` sebagai URL (schema punya `.url()` tapi tidak dipakai) | 2 jam |
| **P1** | `pages/products/index.astro` — frontmatter `await api.get('/products')` + `await api.get('/categories')` | SSR fetch sudah benar. Tambahkan `initialData` prop ke island filters jika ada (atau tidak ada island di PLP). **Priority**: tambah `Cache-Control: s-maxage=60` header di Astro response untuk edge caching. Pertimbangkan bungkus product grid dalam island dengan `useQuery(['products', queryParams])` + `initialData` untuk filter tanpa full-page reload | LCP: setiap filter change → full SSR round trip. `useQuery` + `initialData` enabling client-side navigation tanpa CLS | 4 jam |
| **P1** | `components/islands/AddressManager.tsx` — `AddressForm`: `useState<FormState>` + manual `set(key, value)` | Migrasi ke TanStack Form. Gunakan `createAddressSchema` dari `@repo/common/schemas/user.schema.ts`. Ganti `CitySearch` input → bungkus dengan `form.Field` | Schema tersedia (`createAddressSchema` = `addressSchema`). Validasi postal code pattern dilakukan di `<input pattern>` HTML bukan Zod | 3 jam |
| **P1** | `components/islands/AddressManager.tsx` — `CitySearch.search()` via `useCallback` + debounce manual | Ganti → `useQuery(['cities', query], { enabled: query.length >= 2, staleTime: 5 * 60_000 })`. Ganti debounce manual dengan `useDebounce(query, 320)` (atau `@tanstack/query` built-in `placeholderData`) | City list adalah data statis dari RajaOngkir. Tidak ada caching → setiap keystroke hit API. staleTime panjang aman | 2 jam |
| **P1** | `components/islands/SearchBar.tsx` — `useCallback(search)` + debounce manual + `AbortController` + `useState<Suggestion[]>` | Ganti → `useQuery(['search', query], { enabled: query.trim().length >= 2, staleTime: 30_000 })`. TanStack Query handle AbortController secara otomatis via `signal`. Buat custom hook `useProductSearch(query)` | Saat ini duplikasi logika AbortController + debounce. `useQuery` otomatis abort request stale | 2 jam |
| **P1** | `components/islands/ProductQuickView.tsx` — `useEffect` fetch `${BASE}/products/slug/${slug}` + `useState<ProductDetail>` | Ganti → `useQuery(['product', 'slug', slug], { enabled: !!slug })`. Hilangkan direct `BASE` URL — gunakan `apiProxy.get` atau relative URL via Astro proxy | Fetch direct ke API Gateway tanpa cookie auth. Harus melalui `/api/proxy` | 2 jam |
| **P2** | `pages/orders/index.astro` — frontmatter `api.get('/orders/me')` | SSR fetch sudah benar. Tambahkan `initialData` ke `useQuery(['orders', 'me'])` jika akan dibuat island. Jika tetap full SSR, tambahkan `Cache-Control: private, max-age=0` (data sensitif) | Order list perlu auth, tidak bisa di-cache di edge. Island opsional | 2 jam |
| **P2** | `components/islands/RecentlyViewed.tsx` | Bukan server data — murni localStorage. Tetap pakai nanostore. **Only**: ganti custom `<a>` product card → `@repo/ui/Card` atau shared `ProductCard` component | localStorage data, tidak perlu TanStack Query | 1 jam |
| **P2** | `components/islands/OrderStatusTracker.tsx` — `useState(status)`, `useState(history)` | Komponen ini pakai SSE (EventSource) bukan fetch biasa. Tetap pakai `useState` untuk SSE updates. **Only**: bungkus dalam `useQuery(['order', orderId])` untuk initial data fetch jika SSE tidak connect. Ganti `useState` loading states → `useQuery` pattern | SSE tidak di-support langsung TanStack Query. Custom hook `useOrderStream(orderId)` yang wraps EventSource + `useQuery` untuk initial state | 3 jam |
| **P2** | `components/islands/ReorderButton.tsx` | Buat `useMutation(['reorder'])` dengan `onSuccess: () => invalidateQueries(['cart'])` | Belum dibaca isinya — kemungkinan ada fetch manual | 1 jam |
| **P2** | `components/islands/WishlistButton.tsx` — `useEffect(hydrateWishlist)` | Setelah wishlist store dimigrasi ke `useQuery`, update WishlistButton untuk konsumsi `useQuery(['wishlist', 'ids'])` dari shared cache. Hapus `hydrateWishlist` call | Saat ini setiap WishlistButton mount → 1 API call. Dengan shared cache → 0 duplicate requests | 1 jam |
| **P2** | `components/islands/CartPage.tsx`, `CartDrawer.tsx`, `CheckoutForm.tsx`, `AuthForm.tsx` | Ganti semua custom `<button>` CTA → `@repo/ui/Button`. Ganti custom spinner → `@repo/ui/Spinner`. Ganti custom error box → `@repo/ui/Alert` | Duplikasi kode UI. @repo/ui sudah punya semua komponen ini | 3 jam total |
| **P2** | `components/islands/SearchBar.tsx`, `AddressManager.tsx`, `ProductReviews.tsx` | Ganti semua `<input>` custom → `@repo/ui/Input`. Ganti `<select>` → `@repo/ui/Select` atau `@repo/ui/NativeSelect`. Ganti `<textarea>` → `@repo/ui/Textarea` | Duplikasi Tailwind class yang identik. Focus ring, border, padding tidak konsisten antar komponen | 3 jam total |
| **P2** | `components/islands/UserDropdown.tsx` | Ganti custom dropdown panel → `@repo/ui/DropdownMenu` (Radix-based, sudah ada di packages/ui). Hapus manual `useEffect` untuk outside click — Radix handle ini | Saat ini `useEffect` + `mousedown` listener duplikasi logika yang Radix DropdownMenu sudah handle | 2 jam |
| **P2** | `packages/common/schemas/` | Buat `cartItemClientSchema` untuk validasi client-side cart (quantity > 0, variantId non-empty). Buat `shippingRateSelectSchema` untuk validasi pemilihan shipping rate di CheckoutForm | Schema `cartItemSchema` yang ada hanya untuk server. Client perlu schema yang lebih ringan tanpa UUID validation | 1 jam |

---

## ### 3. Rekomendasi Penyesuaian

### a. Arsitektur QueryClient

**Dimana taruh `QueryClientProvider`:**

Astro islands berjalan sebagai isolated React trees. Setiap island adalah entry point terpisah. Ada 2 strategi:

1. **Recommended**: Buat wrapper island `QueryProvider.tsx` yang di-mount di `BaseLayout.astro` dengan `client:load`. Semua island yang butuh shared cache harus di-render _di dalam_ provider yang sama via Astro's `<slot>` atau gunakan [Nanostores sebagai bridge](https://docs.astro.build/en/guides/state-management/#sharing-state) untuk sinyal sederhana. Untuk islands yang **harus share cache** (CartPage + CartDrawer, WishlistButton + WishlistPreview), bungkus keduanya dalam 1 React island parent.

2. **Alternatif**: Setiap island punya QueryClientProvider-nya sendiri, tapi gunakan `persistQueryClient` dengan `localStorage` agar cache tidak hilang antar islands.

```
Contoh struktur di BaseLayout.astro:
<QueryProviderIsland client:load>  <!-- satu provider untuk semua -->
  <CartDrawer />
  <slot />  <!-- halaman-spesifik islands masuk sini -->
</QueryProviderIsland>
```

**Strategi `staleTime` & `gcTime` per tipe data:**

| Data | staleTime | gcTime | Alasan |
|------|-----------|--------|--------|
| `cart` | `0` (always fresh) | `5 menit` | Cart berubah dari banyak sumber (tab lain, server) |
| `wishlist/ids` | `2 menit` | `10 menit` | Toggle wishlist jarang, tapi harus konsisten |
| `wishlist/items` | `1 menit` | `5 menit` | Preview list, bisa sedikit stale |
| `products` (PLP) | `5 menit` | `30 menit` | Product catalog jarang berubah |
| `product` (PDP) | `3 menit` | `15 menit` | Harga/stok bisa berubah |
| `orders/me` | `30 detik` | `5 menit` | User ingin status terbaru |
| `shippingRates` | `10 menit` | `30 menit` | Rate RajaOngkir stabil dalam satu sesi |
| `cities` | `30 menit` | `60 menit` | Data kota RajaOngkir hampir tidak berubah |
| `reviews` | `2 menit` | `10 menit` | Review baru muncul setelah submit |

**Persist cache ke localStorage:**  
- **Ya untuk**: `cart`, `wishlist/ids` — untuk offline support + guest user experience  
- **Tidak untuk**: `orders`, `user` — data sensitif, tidak boleh persisted di localStorage  
- Gunakan `@tanstack/query-persist-client-core` dengan `createSyncStoragePersister`

---

### b. SSR + InitialData Pattern

**File `.astro` yang harus fetch di frontmatter untuk SEO:**

| Page | Harus SSR | Data yang Fetch |
|------|-----------|-----------------|
| `pages/index.astro` | **Ya** (✅ sudah) | `getHomeBFF()` — featured products + categories untuk LCP |
| `pages/products/index.astro` | **Ya** (✅ sudah) | products + categories. Tambah initialData ke island filter |
| `pages/products/[slug].astro` | **Ya** (✅ sudah) | `getPDPBFF()` — OG tags butuh data produk |
| `pages/orders/index.astro` | **Ya** (✅ sudah) | SSR order list. Tidak perlu island — halaman tidak dynamic |
| `pages/cart.astro` | **Tidak** | Cart = client-only (localStorage). Tidak ada SEO value |
| `pages/checkout.astro` | **Tidak** | Addresses sudah di-pass sebagai prop ke CheckoutForm |
| `pages/profile/index.astro` | **Sebagian** | Fetch user + addresses di frontmatter, pass sebagai `initialData` |

**Cara pass `initialData` ke island tanpa prop drilling:**

```typescript
// Di .astro frontmatter:
const { data: orders } = await api.get('/orders/me', { token });

// Di template:
<OrderHistory 
  client:load 
  initialData={orders}   // ← pass sebagai prop
/>

// Di island:
export default function OrderHistory({ initialData }) {
  const { data } = useQuery({
    queryKey: ['orders', 'me'],
    queryFn: () => apiProxy.get('/orders/me'),
    initialData,                          // ← hydrate dari SSR
    initialDataUpdatedAt: Date.now(),     // ← agar staleTime dihitung dari SSR time
  });
}
```

**Kapan pakai `defer` vs fetch di frontmatter:**
- **Fetch di frontmatter** (blocking): Data yang dibutuhkan untuk SEO (meta tags, OG), data above-the-fold (product name, price, main image)
- **`defer` / client:visible**: Data below-the-fold (reviews, recently viewed, related products)
- **client:idle**: Komponen analytics/tracking (TrackProductView) — sudah benar

---

### c. Optimistic Update

**Mutations yang wajib optimistic:**

| Mutation | onMutate | onError | onSettled |
|----------|----------|---------|-----------|
| `addToCart` | `setQueryData(['cart'], prev => [...prev, newItem])` | `setQueryData(['cart'], previousCart)` | `invalidateQueries(['cart'])` |
| `updateCartQty` | `setQueryData(['cart'], prev => update item qty)` | `setQueryData(['cart'], previousCart)` | `invalidateQueries(['cart'])` |
| `removeFromCart` | `setQueryData(['cart'], prev => filter item)` | `setQueryData(['cart'], previousCart)` | `invalidateQueries(['cart'])` (tapi tunda 6 detik untuk undo!) |
| `toggleWishlist` | `setQueryData(['wishlist', 'ids'], prev => toggle id in Set)` | `setQueryData(['wishlist', 'ids'], previousIds)` | `invalidateQueries(['wishlist'])` |
| `removeWishlistItem` | `setQueryData(['wishlist', 'items'], prev => filter)` | Rollback + toast error | `invalidateQueries(['wishlist'])` |

**Pattern `onMutate` + `onError` + `onSettled` yang konsisten:**

```typescript
const mutation = useMutation({
  mutationFn: (variantId: string) => apiProxy.delete(`/cart/items/${variantId}`),
  onMutate: async (variantId) => {
    // 1. Cancel outgoing refetches agar tidak override optimistic update
    await queryClient.cancelQueries({ queryKey: ['cart'] });
    // 2. Snapshot state sebelumnya
    const previousCart = queryClient.getQueryData(['cart']);
    // 3. Optimistic update
    queryClient.setQueryData(['cart'], (old) => 
      old.filter(item => item.variantId !== variantId)
    );
    // 4. Return snapshot untuk rollback
    return { previousCart };
  },
  onError: (err, variantId, context) => {
    // Rollback ke snapshot
    queryClient.setQueryData(['cart'], context.previousCart);
    toast.error('Gagal menghapus item');
  },
  onSettled: () => {
    // Selalu sync dengan server setelah mutasi selesai
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  },
});
```

**Undo Toast (removeFromCart) — special case:**  
`requestRemoveFromCart` saat ini menggunakan nanostore signal. Setelah migrasi, tunda `mutation.mutate()` selama 6 detik di UndoToast. `onMutate` dijalankan langsung untuk optimistic update, `mutationFn` dipanggil setelah delay.

---

### d. Form + Validasi

**Form yang harus dimigrasi ke TanStack Form (urutan prioritas):**

| Form | Schema yang Dipakai | Validasi Yang Kurang |
|------|---------------------|----------------------|
| `AuthForm.tsx` (login + register) | `loginSchema`, `registerSchema` dari `@repo/common/schemas/user.schema.ts` | Validasi password uppercase/lowercase/angka tidak ditampilkan realtime. `confirmPassword` mismatch hanya muncul setelah submit |
| `CheckoutForm.tsx` | `createOrderSchema` dari `@repo/common/schemas/order.schema.ts` + `validateVoucherSchema` | Tidak ada validasi courier/address required sebelum submit |
| `AddressManager.tsx` (AddressForm) | `createAddressSchema` dari `@repo/common/schemas/user.schema.ts` | Postal code divalidasi dengan HTML `pattern`, bukan Zod |
| `ProductReviews.tsx` (write form) | `createReviewSchema` dari `@repo/common/schemas/product.schema.ts` | Rating 0 hanya disable button, tidak ada error message |
| `UserSettingsForm.tsx` (ProfileTab) | `updateProfileSchema` dari `@repo/common/schemas/user.schema.ts` | `avatarUrl` tidak divalidasi sebagai URL valid sebelum submit |

**Cara integrasi Zod schema dari `@repo/common` ke TanStack Form:**

```typescript
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { loginSchema } from '@repo/common/schemas/user.schema'

const form = useForm({
  defaultValues: { email: '', password: '' },
  validatorAdapter: zodValidator(),
  validators: {
    onChange: loginSchema,  // validasi realtime per field
    onSubmit: loginSchema,  // validasi ketat saat submit
  },
  onSubmit: async ({ value }) => {
    // value sudah typed & validated
    await api.post('/auth/login', value);
  },
});
```

**Error handling — field-level vs toast:**
- **Field-level**: Semua validasi input user (email format, password strength, required field)
- **Toast (Sonner dari @repo/ui)**: Error dari server (401, 409 email sudah terdaftar, 422 voucher invalid)
- **Inline banner**: Error yang block seluruh form (network error, server 500)

---

### e. @repo/ui Consistency

**Komponen yang harus diganti ke @repo/ui (sudah tersedia):**

| Komponen Custom | Ganti Dengan | File Yang Terdampak |
|-----------------|--------------|---------------------|
| Custom `<button>` dengan Tailwind | `@repo/ui/Button` (variant: default, outline, destructive) | CartPage, CartDrawer, CheckoutForm, AuthForm, AddressManager, ProductReviews, AddToCartButton |
| Custom `<input type="text/email/password">` | `@repo/ui/Input` | AuthForm, UserSettingsForm, AddressManager, ProductReviews, CheckoutForm |
| Custom `<textarea>` | `@repo/ui/Textarea` | AddressManager, CheckoutForm, ProductReviews |
| Custom `<select>` | `@repo/ui/NativeSelect` atau `@repo/ui/Select` (Radix) | ProductReviews (order picker), CheckoutForm (sort) |
| Custom loading spinner `animate-spin` | `@repo/ui/Spinner` | CartPage, CheckoutForm, AddressManager, SearchBar, ProductQuickView |
| Custom dropdown | `@repo/ui/DropdownMenu` | UserDropdown |
| Custom error/success banner | `@repo/ui/Alert` | AuthForm, UserSettingsForm, AddressManager |
| `Badge` Astro component (`shared/Badge.astro`) | `@repo/ui/Badge` (sudah dipakai di OrderHistory) | `pages/products/[slug].astro` (tags), `shared/Badge.astro` bisa dihapus |
| Custom `<Card>` pattern | `@repo/ui/Card` | CartPage summary, CheckoutForm sections |
| Custom pagination di `orders/index.astro` | `@repo/ui/Pagination` (sudah ada di packages/ui) | `pages/orders/index.astro`, bisa replace `shared/Pagination.astro` |

**Perlu bikin wrapper `@repo/ui/FormField` untuk TanStack Form:**

Ya — buat komponen di `packages/ui/src/components/form-field.tsx`:

```typescript
// packages/ui/src/components/form-field.tsx
// Wrapper yang menghubungkan TanStack Form field state ke @repo/ui/Input + Label + error
export function FormField({ form, name, label, ...inputProps }) {
  return (
    <form.Field name={name}>
      {(field) => (
        <div className="space-y-1.5">
          <Label htmlFor={name}>{label}</Label>
          <Input
            id={name}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            {...inputProps}
          />
          {field.state.meta.errors.map((err) => (
            <p className="text-xs text-destructive">{err}</p>
          ))}
        </div>
      )}
    </form.Field>
  );
}
```

---

### f. Developer Experience

**Setup React Query Devtools hanya di dev:**

```typescript
// Di QueryProvider island:
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

**Custom hooks yang perlu dibuat (di `apps/web/src/hooks/`):**

| Hook | Mengantikan | Query Key |
|------|-------------|-----------|
| `useCart()` | `useStore($cart)` + `fetchServerCart` | `['cart']` |
| `useCartMutations()` | `addToCart`, `updateQuantity`, `removeFromCart` dari store | — |
| `useWishlist(productId?)` | `useStore($wishlistedIds)` + `hydrateWishlist` | `['wishlist', 'ids']` |
| `useProducts(params)` | fetch manual di island | `['products', params]` |
| `useProduct(slug)` | fetch manual di ProductQuickView | `['product', 'slug', slug]` |
| `useOrders(params)` | `useEffect` di OrderHistory | `['orders', 'me', params]` |
| `useReviews(productId)` | `useEffect` di ProductReviews | `['reviews', productId]` |
| `useProductSearch(query)` | `useCallback(search)` di SearchBar | `['search', query]` |
| `useCities(query)` | `CitySearch.search()` di AddressManager | `['cities', query]` |
| `useShippingRates(cityId, weight)` | `fetchRates` di CheckoutForm | `['shippingRates', cityId, weight]` |
| `useOrderStream(orderId)` | EventSource logic di OrderStatusTracker | `['order', orderId]` + EventSource |

**ESLint rule — larang fetch langsung di komponen:**

Tambahkan ke `apps/web/eslint.config.js`:

```javascript
// eslint.config.js
{
  rules: {
    // Larang fetch() langsung di file komponen React — harus via api/apiProxy/useQuery
    'no-restricted-globals': [
      'error',
      {
        name: 'fetch',
        message: 'Gunakan apiProxy.get/post/patch/delete atau useQuery/useMutation. Fetch langsung tidak boleh di komponen React.',
      },
    ],
    // Larang useEffect untuk data fetching
    'react-hooks/exhaustive-deps': 'warn', // sudah ada
  },
}
```

Tambah custom ESLint rule atau komentar `// eslint-disable-next-line` hanya di `lib/api.ts` dan stores yang memang boleh pakai `fetch` langsung.

---

## ### 4. Estimasi Timeline

### Week 1 — P0 Tasks (Critical Path)

| Hari | Task | Output |
|------|------|--------|
| **Senin** | Setup `QueryClientProvider` island di `BaseLayout.astro`. Install `@tanstack/react-query` v5 + `@tanstack/react-form` v1 + `@tanstack/zod-form-adapter`. Setup Devtools | QueryClient berjalan, cache terisolasi per island |
| **Selasa** | Migrasi `cart.store.ts` → `useQuery(['cart'])` + 4x `useMutation` dengan optimistic + rollback | Cart mutations aman dengan server rollback |
| **Rabu** | Migrasi `CartPage.tsx` + `CartDrawer.tsx` untuk share `useQuery(['cart'])`. Tambah `@repo/ui/Button`, `@repo/ui/Spinner` | CartPage tidak ada loading spinner blocking, CartDrawer sync real-time |
| **Kamis** | Migrasi `CheckoutForm.tsx` → `useQuery(['shippingRates'])` + 2x `useMutation`. Mulai migrasi form ke TanStack Form + `createOrderSchema` | Shipping rates di-cache. Form validasi sebelum submit |
| **Jumat** | Migrasi `AuthForm.tsx` → TanStack Form + `loginSchema` + `registerSchema`. Field-level validation realtime | Auth form menampilkan error per field |

### Week 2 — P1 Tasks (Important)

| Hari | Task | Output |
|------|------|--------|
| **Senin** | Migrasi `OrderHistory.tsx` + `WishlistPreview.tsx` → `useQuery` + `useMutation`. Buat custom hooks `useOrders()`, `useWishlist()` | Order & wishlist ter-cache, tidak re-fetch setiap mount |
| **Selasa** | Migrasi `wishlist.store.ts` → shared `useQuery(['wishlist', 'ids'])`. Update `WishlistButton.tsx` | Single source of truth untuk wishlist IDs |
| **Rabu** | Migrasi `ProductReviews.tsx` → `useQuery` + `useInfiniteQuery` + `useMutation`. Migrasi write form → TanStack Form + `createReviewSchema` | Infinite scroll reviews. Form realtime validation |
| **Kamis** | Migrasi `UserSettingsForm.tsx` → TanStack Form + `updateProfileSchema`. Migrasi `AddressManager.tsx` → `useMutation`. `CitySearch` → `useQuery(['cities'])` | Profile + Address form dengan validasi schema |
| **Jumat** | Migrasi `SearchBar.tsx` → `useQuery(['search'])`. Migrasi `ProductQuickView.tsx` → `useQuery(['product', slug])`. Buat `useProductSearch()`, `useProduct()` hooks | Search ter-cache. QuickView tidak re-fetch produk yang sama |

### Week 3 — P2 Tasks + Testing

| Hari | Task | Output |
|------|------|--------|
| **Senin** | Buat `packages/ui/src/components/form-field.tsx` wrapper. Ganti semua `<input>`, `<button>`, `<textarea>` sisa → `@repo/ui` components. Hapus `shared/Badge.astro` (pakai `@repo/ui/Badge`) | UI konsisten, kode duplikasi berkurang |
| **Selasa** | Migrasi `UserDropdown.tsx` → `@repo/ui/DropdownMenu`. Implementasi `useOrderStream()` hook untuk `OrderStatusTracker.tsx`. Tambah `Cache-Control` header di Astro response products/index.astro | UserDropdown accessible, OrderTracker dengan initial data |
| **Rabu** | Tambah `cartItemClientSchema` + `shippingRateSelectSchema` di `packages/common/schemas/`. Setup ESLint rule `no-restricted-globals: fetch` | Schema client-side lengkap. ESLint enforce fetch policy |
| **Kamis** | Setup `persistQueryClient` + `createSyncStoragePersister` untuk cart + wishlist IDs. Test offline scenario | Cart + wishlist survive page refresh |
| **Jumat** | Audit Core Web Vitals sebelum vs sesudah (Lighthouse, WebPageTest). Fix regresi INP (button responsiveness). Dokumentasi query keys di `QUERY_KEYS.md` | LCP < 2.5s, INP < 200ms, CLS < 0.1 |

---

## ### 5. Query Key Conventions

Semua query keys harus mengikuti konvensi hierarki berikut agar `invalidateQueries` bekerja dengan tepat:

```typescript
// apps/web/src/lib/queryKeys.ts
export const queryKeys = {
  cart:           () => ['cart'] as const,
  wishlist: {
    ids:          () => ['wishlist', 'ids'] as const,
    items:        (params: object) => ['wishlist', 'items', params] as const,
  },
  products: {
    all:          () => ['products'] as const,
    list:         (params: object) => ['products', 'list', params] as const,
    detail:       (slug: string) => ['products', 'detail', slug] as const,
    search:       (query: string) => ['products', 'search', query] as const,
  },
  reviews: {
    list:         (productId: string) => ['reviews', productId] as const,
    summary:      (productId: string) => ['reviews', 'summary', productId] as const,
  },
  orders: {
    all:          () => ['orders'] as const,
    me:           (params: object) => ['orders', 'me', params] as const,
    detail:       (id: string) => ['orders', id] as const,
  },
  shipping: {
    cities:       (query: string) => ['shipping', 'cities', query] as const,
    rates:        (cityId: string, weight: number) => ['shipping', 'rates', cityId, weight] as const,
  },
  user: {
    me:           () => ['user', 'me'] as const,
    addresses:    () => ['user', 'addresses'] as const,
  },
} as const;
```

---

*Dokumen ini hanya berisi rencana migrasi. Implementasi dilakukan bertahap sesuai prioritas P0 → P1 → P2.*
