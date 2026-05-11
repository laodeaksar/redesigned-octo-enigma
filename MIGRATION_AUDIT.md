# TanStack Query + Form + Sonner Migration Audit

**Date**: 2026-05-11  
**Scope**: `apps/web/src` — all P0 islands + shared mutation hooks

---

## Summary

Migrated the customer storefront (`apps/web`) from:
- Manual `fetch` + `useState` + `useEffect` data-fetching patterns
- Custom inline toast state / DOM-injected toast divs / `alert()`
- `alert()` error dialogs

To:
- **@tanstack/react-query** `useQuery` / `useQueries` / `useMutation` for all data
- **sonner** toasts via the `notify` wrapper (`@/lib/toast`)
- Native browser `confirm()` kept where appropriate (no silent fallbacks)

---

## Files Created

| File | Purpose |
|------|---------|
| `apps/web/src/lib/toast.ts` | `notify` wrapper over sonner — single import point for all toast calls |
| `apps/web/src/components/providers/ToastProvider.tsx` | `<Toaster>` island mounted in BaseLayout (`client:load`) |

---

## Files Modified

### Layout

| File | Change |
|------|--------|
| `apps/web/src/components/layout/BaseLayout.astro` | Added `<ToastProvider client:load />` as first always-mounted island |

### Mutation Hooks

| File | Change |
|------|--------|
| `apps/web/src/hooks/mutations/useAddToCart.ts` | `notify.error` on `onError` rollback |
| `apps/web/src/hooks/mutations/useRemoveFromCart.ts` | `notify.error` on `onError` rollback |
| `apps/web/src/hooks/mutations/useUpdateUser.ts` | `notify.success` on `onSuccess`, `notify.error` on `onError` |

### P0 Islands

| File | Before | After |
|------|--------|-------|
| `ComparePage.tsx` | `useEffect` + `Promise.all(fetchDetail)` + `useState` | `useQueries` per slug, `staleTime: 5m`, wrapped in `QueryClientProvider` |
| `ProductQuickView.tsx` | `fetch` in `useEffect` on slug change | `useQuery({ queryKey: ["product-detail", slug], enabled: !!slug })`, `useEffect` for side effects on product change |
| `ProductReviews.tsx` | `Promise.all([summary, reviews])` in `useEffect`, manual submit | `useQuery` for summary + page-1 reviews; `useQuery` for orders (enabled when form open + logged in); `useMutation` for submit with `notify.success/error` |
| `AddressManager.tsx` | Custom toast `div` + `showToast` state + `alert()` | `notify.success` on create/update/delete success; `notify.error` on delete failure; custom toast state + div removed |
| `OrderHistory.tsx` | `fetch` in `useEffect` + `useState` | `useQuery({ queryKey: ["orders", "me", ...] })`, wrapped in `QueryClientProvider` |
| `UserSettingsForm.tsx` | Custom `SuccessAlert` component shown after save | Toast emitted by `useUpdateUser` hook (`notify.success/error`) — component no longer manages success state |

---

## Islands NOT Migrated (intentional)

| File | Reason |
|------|--------|
| `AuthForm.tsx` | On success → redirect; error shown inline. No toast needed. |
| `CartPage.tsx` | `window.confirm()` for clear-cart kept (native confirm is appropriate). Cart mutations already use optimistic update + `UndoToast`. |
| `CheckoutForm.tsx` | Complex multi-step payment flow with Midtrans redirect. Migration deferred. |
| `SearchBar.tsx` | Debounced fetch with AbortController for search suggestions. No toast needed (results shown inline). |
| `PushNotificationManager.tsx` | Service-worker subscription flow. No user-visible toast needed. |
| `useUpdateCartQty.ts` | `UndoToast` component already handles all UX feedback for remove-on-zero. |

---

## Architecture Decisions

### QueryClient singleton pattern
Each island that uses TanStack Query wraps itself with `<QueryClientProvider client={queryClient}>` using the module-level singleton from `@/lib/query-client.ts`. This shares a single cache across all islands on the page without requiring a top-level provider (impossible in Astro island architecture — each `client:*` directive creates a separate React root).

### `notify` wrapper
All toast calls go through `@/lib/toast` — never direct sonner imports in components. This keeps the toast system swappable and testable.

### `alert()` → `notify.error()`
All `alert()` calls replaced with `notify.error()` (non-blocking, dismissible). `confirm()` retained where a blocking confirmation is semantically correct (address delete).

### `staleTime` defaults
- Product detail queries: 5 minutes (product data changes infrequently)
- Order history: 30 seconds (orders can change status)
- Review summary + list: 60 seconds
- User orders for review form: 5 minutes

---

## Checklist

- [x] `sonner` installed in `apps/web`
- [x] `notify` wrapper created
- [x] `ToastProvider` mounted in `BaseLayout` (`client:load`)
- [x] `useAddToCart` — `notify.error` on rollback
- [x] `useRemoveFromCart` — `notify.error` on rollback
- [x] `useUpdateUser` — `notify.success` + `notify.error`
- [x] `ComparePage` — `useQueries`
- [x] `ProductQuickView` — `useQuery`
- [x] `ProductReviews` — `useQuery` (summary, reviews, orders) + `useMutation`
- [x] `AddressManager` — `notify.success/error`, removed custom toast div + `alert()`
- [x] `OrderHistory` — `useQuery`
- [x] `UserSettingsForm` — `notify` via hook, removed `SuccessAlert`
