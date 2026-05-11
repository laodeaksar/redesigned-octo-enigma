# MIGRATION AUDIT - apps/web/src
Tanggal: Mon May 11 02:11:49 PM UTC 2026

## 1. Fetch Manual - Perlu Migrasi ke useQuery
Command: grep -r "fetch(" src/ --include="*.tsx" --include="*.ts" --include="*.astro"
src/api/orders.ts:24:    const res = await fetch(target.toString(), {
src/api/products/[productId]/reviews.ts:17:    const res = await fetch(target.toString());
src/api/products/[productId]/reviews.ts:47:    const res = await fetch(`${GW}/products/${params.productId}/reviews`, {
src/api/products/[productId]/summary.ts:13:    const res = await fetch(
src/components/islands/AuthForm.tsx:51:        await fetch("/api/auth/session", {
src/components/islands/AuthForm.tsx:78:        await fetch("/api/auth/session", {
src/components/islands/PushNotificationManager.tsx:34:      const res = await fetch("/api/push/vapid-public-key");
src/components/islands/PushNotificationManager.tsx:48:      await fetch("/api/push/subscribe", {
src/components/islands/PushNotificationManager.tsx:126:      await fetch("/api/push/subscribe", {
src/components/islands/SearchBar.tsx:68:      const res = await fetch(
src/components/islands/ComparePage.tsx:26:    const r = await fetch(`${BASE}/products/slug/${slug}`);
src/components/islands/ProductQuickView.tsx:18:  const r = await fetch(`${BASE}/products/slug/${slug}`);
src/components/islands/ProductReviews.tsx:251:      fetch(`/api/products/${productId}/summary`)
src/components/islands/ProductReviews.tsx:260:      fetch(`/api/products/${productId}/reviews?page=1&limit=10`).then(r =>
src/components/islands/ProductReviews.tsx:269:      fetch("/api/orders?limit=30")
src/components/islands/ProductReviews.tsx:293:      const r = await fetch(
src/components/islands/ProductReviews.tsx:310:      const res = await fetch(`/api/products/${productId}/reviews`, {
src/lib/api.ts:104:  const res = await fetch(url.toString(), { ...init, headers });
src/lib/api.ts:175:  const res = await fetch(url.toString(), { ...init, headers });
src/pages/api/orders.ts:24:    const res = await fetch(target.toString(), {
src/pages/api/orders/[id]/stream.ts:22:    upstream = await fetch(upstreamUrl, {
src/pages/api/products/[productId]/reviews.ts:17:    const res = await fetch(target.toString());
src/pages/api/products/[productId]/reviews.ts:47:    const res = await fetch(`${GW}/products/${params.productId}/reviews`, {
src/pages/api/products/[productId]/summary.ts:13:    const res = await fetch(
src/pages/api/proxy/[...path].ts:61:    upstreamRes = await fetch(upstreamUrl.toString(), {
src/stores/cart.store.ts:112:    const res = await fetch("/api/proxy/cart/merge", {
src/stores/cart.store.ts:146:    const res = await fetch("/api/proxy/cart");
src/stores/cart.store.ts:169:    await fetch("/api/proxy/cart/items", {
src/stores/cart.store.ts:184:    await fetch(`/api/proxy/cart/items/${variantId}`, {
src/stores/cart.store.ts:199:    await fetch(`/api/proxy/cart/items/${variantId}`, {
src/stores/cart.store.ts:212:    await fetch("/api/proxy/cart", { method: "DELETE" });
src/stores/wishlist.store.ts:31:    const res = await fetch(API);
src/stores/wishlist.store.ts:62:    const res = await fetch(`${API}/${productId}/toggle`, { method: "POST" });

## 2. useState untuk Data Server - Perlu useQuery
Command: grep -r "useState.*Product|useState.*Cart|useState.*User|useState.*Order" src/
Tidak ditemukan

## 3. useEffect + Fetch - Anti-pattern, Perlu useQuery
Tidak ditemukan

## 4. Form Manual onSubmit - Perlu TanStack Form
src/components/islands/AuthForm.tsx
src/components/islands/SearchBar.tsx
src/components/islands/ProductReviews.tsx
src/components/islands/AddressManager.tsx

## 5. Alert/Toast Manual - Perlu Migrasi ke Sonner
Tidak ditemukan

## 6. Status Infrastruktur TanStack
QueryClientProvider:
src/components/islands/CartDrawer.tsx
src/components/islands/ProductGrid.tsx
src/components/islands/OrderHistory.tsx
src/components/islands/ComparePage.tsx
src/components/islands/ProductQuickView.tsx
src/components/islands/ProductReviews.tsx
src/components/islands/UserSettingsForm.tsx
src/components/islands/CheckoutForm.tsx
src/components/providers/QueryProvider.tsx
Query Keys Factory:
src/lib/query-keys.ts
Fetcher Zod:
src/lib/fetcher.ts

## 7. Status Toast/Sonner
Toast @repo/ui:
BELUM ADA di @repo/ui
Sonner installed:
    "sonner": "^2.0.7",
ToastProvider island:
src/components/providers/ToastProvider.tsx
notify wrapper:
src/lib/toast.ts

## 8. Astro Islands - Cek client:directive
src/pages/auth/login.astro:        <AuthForm client:load mode="login" redirectTo={redirectTo} />
src/pages/auth/login.astro:        <OAuthButtons client:load mode="login" redirectTo={redirectTo} />
src/pages/auth/register.astro:        <AuthForm client:load mode="register" redirectTo="/" />
src/pages/auth/register.astro:        <OAuthButtons client:load mode="register" redirectTo="/" />
src/pages/cart.astro:    <CartPage client:load isLoggedIn={isLoggedIn} />
src/pages/checkout.astro:    <CheckoutForm client:load addresses={addresses} />
src/pages/compare.astro:    <ComparePage client:load />
src/pages/index.astro:    <RecentlyViewed client:visible />
src/pages/orders/[id]/track.astro:      client:load
src/pages/orders/[id].astro:          client:idle
src/pages/orders/[id].astro:        <ReorderButton client:load items={order.items} />
src/pages/orders/[id].astro:        client:load
src/pages/products/[slug].astro:            client:load
src/pages/products/[slug].astro:              client:load
src/pages/products/[slug].astro:              client:load
src/pages/products/[slug].astro:      client:visible
src/pages/products/[slug].astro:    client:idle
src/pages/products/[slug].astro:      client:visible
src/pages/products/index.astro:          client:load
src/pages/profile/addresses.astro:    <AddressManager client:load initialAddresses={addresses} />
src/pages/profile/index.astro:              client:load
src/pages/profile/index.astro:            client:visible
src/pages/profile/index.astro:            client:visible
src/components/layout/Navbar.astro:      <SearchBar client:load />
src/components/layout/Navbar.astro:        <UserDropdown client:load user={user} />
src/components/layout/Navbar.astro:    <SearchBar client:load />
src/components/layout/BaseLayout.astro:    <ToastProvider client:only="react" />
src/components/layout/BaseLayout.astro:    <CartDrawer client:load isLoggedIn={!!user} />
src/components/layout/BaseLayout.astro:    <ProductQuickView client:idle />
src/components/layout/BaseLayout.astro:    <UndoToast client:idle />
src/components/layout/BaseLayout.astro:    <CompareBar client:idle />
src/components/shared/ProductCard.astro:        client:visible
src/components/shared/ProductCart.astro:    client:idle

## 9. SUMMARY
Total file dengan fetch manual: 17
Total file dengan useState server: 0
Total form manual (onSubmit tanpa useForm): 4
Total alert manual: 0

## 10. PRIORITY LIST
P0 - Critical: Cart, Checkout, ProductGrid, NavbarCart
P1 - Important: UserProfile, OrderHistory, Search
P2 - Nice to have: About, FAQ, Static pages

## 11. NEXT ACTION
1. Install deps jika belum: @tanstack/react-query @tanstack/react-form sonner
2. Setup QueryProvider + Toaster shadcn
3. Migrasi P0 dulu sesuai list di atas
