// =============================================================================
// useOrders — query hook for the current user's order list
//
// Fetches from /api/proxy/orders/me (authenticated via httpOnly cookie proxy).
// Supports pagination + status filter via params.
//
// Usage:
//   const { data, isPending } = useOrders({ params: { limit: 5 } });
//   const orders = data?.items ?? [];
//   const meta   = data?.meta;
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import type { StorefrontOrder } from "@repo/common/types";
import { ordersPageSchema, type OrdersPage } from "@repo/common/schemas";

import { apiProxy } from "@/lib/api";
import { queryKeys, type OrderListParams } from "@/lib/query-keys";

// Re-export shared type so callers don't need a second import
export type OrderItem = StorefrontOrder;
export type { OrdersPage };

// ── Shaped return ─────────────────────────────────────────────────────────────

export interface OrdersResult {
  items: StorefrontOrder[];
  meta: OrdersPage["meta"];
}

// ── Hook ─────────────────────────────────────────────────────────────────────

interface UseOrdersOptions {
  enabled?: boolean;
  params?: OrderListParams;
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { enabled = true, params } = options;

  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: async (): Promise<OrdersResult> => {
      const res = await apiProxy.get<unknown>("/orders/me", {
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 10,
          status: params?.status || undefined,
        },
      });
      const parsed = ordersPageSchema.parse(res);
      return { items: parsed.data, meta: parsed.meta };
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export type UseOrdersReturn = ReturnType<typeof useOrders>;
