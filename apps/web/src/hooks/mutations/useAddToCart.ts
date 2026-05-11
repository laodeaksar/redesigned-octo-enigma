// =============================================================================
// useAddToCart — mutation with full optimistic update
//
// Flow:
//   onMutate   → snapshot cache + nanostore, apply optimistic update to both
//   mutationFn → push to server (if logged in), update local state
//   onError    → rollback cache + nanostore to snapshot
//   onSettled  → invalidate cart query to refetch from server
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiProxy } from "@/lib/api";
import {
  $cart,
  $isCartOpen,
  type CartItem,
} from "@/stores/cart.store";
import type { ServerCart } from "@/hooks/queries/useCart";
import { queryKeys } from "@/lib/query-keys";

interface AddToCartVars {
  item: CartItem;
  isLoggedIn?: boolean;
}

export function useAddToCart() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ item, isLoggedIn = false }: AddToCartVars) => {
      if (isLoggedIn) {
        await apiProxy.post("/cart/items", {
          variantId: item.variantId,
          quantity: item.quantity,
        });
      }
    },

    onMutate: async ({ item }) => {
      // Cancel in-flight queries so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: queryKeys.cart() });

      // Snapshot for rollback
      const previousCache = qc.getQueryData<ServerCart>(queryKeys.cart());
      const previousLocal = [...$cart.get()];

      // Optimistic: update nanostore
      const current = $cart.get();
      const existing = current.find(i => i.variantId === item.variantId);
      if (existing) {
        $cart.set(
          current.map(i =>
            i.variantId === item.variantId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          )
        );
      } else {
        $cart.set([...current, item]);
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("cart", JSON.stringify($cart.get()));
      }

      // Optimistic: update TanStack cache
      qc.setQueryData<ServerCart>(queryKeys.cart(), old => {
        if (!old) return old;
        const existingServer = old.items.find(i => i.variantId === item.variantId);
        const newItems = existingServer
          ? old.items.map(i =>
              i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          : [...old.items, item];
        return {
          ...old,
          items: newItems,
          itemCount: newItems.reduce((s, i) => s + i.quantity, 0),
          subtotal: newItems.reduce((s, i) => s + i.price * i.quantity, 0),
        };
      });

      // Open cart drawer
      $isCartOpen.set(true);

      return { previousCache, previousLocal };
    },

    onError: (_, __, ctx) => {
      // Rollback nanostore
      if (ctx?.previousLocal) {
        $cart.set(ctx.previousLocal);
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("cart", JSON.stringify(ctx.previousLocal));
        }
      }
      // Rollback cache
      if (ctx?.previousCache !== undefined) {
        qc.setQueryData(queryKeys.cart(), ctx.previousCache);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cart() });
    },
  });
}

export type UseAddToCartReturn = ReturnType<typeof useAddToCart>;
