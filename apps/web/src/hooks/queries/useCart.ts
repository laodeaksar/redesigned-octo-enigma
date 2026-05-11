// =============================================================================
// useCart — query hook for server cart (authenticated users)
//
// Design:
//   - When isLoggedIn=true  → fetch from /api/proxy/cart (server source of truth)
//                             and sync result back into the $cart nanostore
//   - When isLoggedIn=false → read directly from $cart nanostore (localStorage)
//
// This means other components that haven't been migrated yet (CartPage,
// CheckoutForm, UndoToast) continue reading from $cart without changes —
// they always see up-to-date data because useCart keeps the nanostore in sync.
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { useStore } from "@nanostores/react";
import { z } from "zod";

import { apiProxy } from "@/lib/api";
import {
  $cart,
  type CartItem,
} from "@/stores/cart.store";
import { queryKeys } from "@/lib/query-keys";

// ── Server cart schema ────────────────────────────────────────────────────────

const serverCartItemSchema = z.object({
  imageUrl: z.string().nullable(),
  price: z.number(),
  productName: z.string(),
  quantity: z.number(),
  sku: z.string(),
  variantId: z.string(),
  variantName: z.string(),
});

export const serverCartSchema = z.object({
  itemCount: z.number(),
  items: z.array(serverCartItemSchema),
  subtotal: z.number(),
});

export type ServerCart = z.infer<typeof serverCartSchema>;

function serverItemToCartItem(i: z.infer<typeof serverCartItemSchema>): CartItem {
  return {
    imageUrl: i.imageUrl,
    price: i.price,
    productName: i.productName,
    quantity: i.quantity,
    sku: i.sku,
    variantId: i.variantId,
    variantName: i.variantName,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCart(isLoggedIn = false) {
  const localItems = useStore($cart);

  const query = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: async (): Promise<ServerCart> => {
      const res = await apiProxy.get<{ success: true; data: ServerCart }>("/cart");
      const parsed = serverCartSchema.parse(res.data);

      // Keep nanostore in sync so non-migrated islands see fresh data
      const cartItems = parsed.items.map(serverItemToCartItem);
      $cart.set(cartItems);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("cart", JSON.stringify(cartItems));
      }

      return parsed;
    },
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 2, // 2 min — cart changes more often than products
  });

  // Derive display values
  const items: CartItem[] = isLoggedIn
    ? (query.data?.items.map(serverItemToCartItem) ?? localItems)
    : localItems;

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    items,
    total,
    count,
    isLoading: isLoggedIn && query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    queryData: query.data,
  };
}

export type UseCartReturn = ReturnType<typeof useCart>;
