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
import { z } from "zod";

import { apiProxy } from "@/lib/api";
import { queryKeys, type OrderListParams } from "@/lib/query-keys";

// ── Schema ────────────────────────────────────────────────────────────────────

export const orderItemSchema = z.object({
  createdAt: z.string(),
  id: z.string(),
  orderNumber: z.string(),
  status: z.string(),
  total: z.number().optional(),
  updatedAt: z.string().optional(),
});

export const ordersResponseSchema = z.object({
  data: z.array(orderItemSchema),
  meta: z.object({
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
    limit: z.number(),
    page: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  success: z.literal(true),
});

export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrdersResponse = z.infer<typeof ordersResponseSchema>;

// ── Shaped return ─────────────────────────────────────────────────────────────

export interface OrdersResult {
  items: OrderItem[];
  meta: OrdersResponse["meta"];
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
      const parsed = ordersResponseSchema.parse(res);
      return { items: parsed.data, meta: parsed.meta };
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export type UseOrdersReturn = ReturnType<typeof useOrders>;
