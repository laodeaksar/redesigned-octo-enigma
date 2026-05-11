// =============================================================================
// useUpdateCartQty — mutation with optimistic update
//
// Updates quantity for a specific cart item.
// quantity = 0 triggers requestRemoveFromCart (undo-toast flow) instead.
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiProxy } from "@/lib/api";
import {
  $cart,
  requestRemoveFromCart,
} from "@/stores/cart.store";
import type { ServerCart } from "@/hooks/queries/useCart";
import { queryKeys } from "@/lib/query-keys";

interface UpdateCartQtyVars {
  isLoggedIn?: boolean;
  quantity: number;
  variantId: string;
}

export function useUpdateCartQty() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ variantId, quantity, isLoggedIn = false }: UpdateCartQtyVars) => {
      if (quantity <= 0) {
        requestRemoveFromCart(variantId);
        return;
      }
      if (isLoggedIn) {
        await apiProxy.patch(`/cart/items/${variantId}`, { quantity });
      }
    },

    onMutate: async ({ variantId, quantity }) => {
      if (quantity <= 0) return; // handled by requestRemoveFromCart

      await qc.cancelQueries({ queryKey: queryKeys.cart() });

      const previousCache = qc.getQueryData<ServerCart>(queryKeys.cart());
      const previousLocal = [...$cart.get()];

      // Optimistic nanostore update
      $cart.set(
        $cart.get().map(i =>
          i.variantId === variantId ? { ...i, quantity } : i
        )
      );
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("cart", JSON.stringify($cart.get()));
      }

      // Optimistic cache update
      qc.setQueryData<ServerCart>(queryKeys.cart(), old => {
        if (!old) return old;
        const newItems = old.items.map(i =>
          i.variantId === variantId ? { ...i, quantity } : i
        );
        return {
          ...old,
          items: newItems,
          itemCount: newItems.reduce((s, i) => s + i.quantity, 0),
          subtotal: newItems.reduce((s, i) => s + i.price * i.quantity, 0),
        };
      });

      return { previousCache, previousLocal };
    },

    onError: (_, __, ctx) => {
      if (ctx?.previousLocal) {
        $cart.set(ctx.previousLocal);
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("cart", JSON.stringify(ctx.previousLocal));
        }
      }
      if (ctx?.previousCache !== undefined) {
        qc.setQueryData(queryKeys.cart(), ctx.previousCache);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cart() });
    },
  });
}

export type UseUpdateCartQtyReturn = ReturnType<typeof useUpdateCartQty>;
