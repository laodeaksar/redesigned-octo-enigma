// =============================================================================
// useRemoveFromCart — mutation with optimistic update
//
// Used by UndoToast after the countdown expires (or directly if no undo needed).
// The UndoToast still uses $removeRequested nanostore to show the countdown,
// then calls this mutation to commit the removal.
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiProxy } from "@/lib/api";
import { notify } from "@/lib/toast";
import {
  $cart,
  $removeRequested,
} from "@/stores/cart.store";
import type { ServerCart } from "@/hooks/queries/useCart";
import { queryKeys } from "@/lib/query-keys";

interface RemoveFromCartVars {
  isLoggedIn?: boolean;
  variantId: string;
}

export function useRemoveFromCart() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ variantId, isLoggedIn = false }: RemoveFromCartVars) => {
      if (isLoggedIn) {
        await apiProxy.delete(`/cart/items/${variantId}`);
      }
    },

    onMutate: async ({ variantId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.cart() });

      const previousCache = qc.getQueryData<ServerCart>(queryKeys.cart());
      const previousLocal = [...$cart.get()];

      // Optimistic nanostore update
      const newItems = $cart.get().filter(i => i.variantId !== variantId);
      $cart.set(newItems);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("cart", JSON.stringify(newItems));
      }

      // Clear the undo-toast event signal
      if ($removeRequested.get() === variantId) {
        $removeRequested.set(null);
      }

      // Optimistic cache update
      qc.setQueryData<ServerCart>(queryKeys.cart(), old => {
        if (!old) return old;
        const filtered = old.items.filter(i => i.variantId !== variantId);
        return {
          ...old,
          items: filtered,
          itemCount: filtered.reduce((s, i) => s + i.quantity, 0),
          subtotal: filtered.reduce((s, i) => s + i.price * i.quantity, 0),
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
      notify.error("Gagal menghapus item", "Silakan coba lagi.");
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cart() });
    },
  });
}

export type UseRemoveFromCartReturn = ReturnType<typeof useRemoveFromCart>;
