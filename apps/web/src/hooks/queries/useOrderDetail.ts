// =============================================================================
// useOrderDetail — query hook for a single order's full details
//
// Fetches from /api/proxy/orders/:id (authenticated via httpOnly cookie proxy).
// Returns the full StorefrontOrderDetail including items, shipping, pricing,
// payment info, and status history.
//
// Usage:
//   const { data: order, isPending, isError } = useOrderDetail(orderId);
//   order?.items         // StorefrontOrderItem[]
//   order?.pricing       // StorefrontOrderPricing
//   order?.shipping      // StorefrontOrderShipping
//   order?.statusHistory // StorefrontOrderStatusEvent[]
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import type { StorefrontOrderDetail } from "@repo/common/types";

import { apiProxy } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

interface UseOrderDetailOptions {
  enabled?: boolean;
}

export function useOrderDetail(
  orderId: string,
  options: UseOrderDetailOptions = {}
) {
  const { enabled = true } = options;

  return useQuery<StorefrontOrderDetail>({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: async () => {
      const res = await apiProxy.get<{ success: true; data: StorefrontOrderDetail }>(
        `/orders/${orderId}`
      );
      return res.data;
    },
    enabled: !!orderId && enabled,
    staleTime: 30 * 1000,
    retry: (count, err: unknown) => {
      // Don't retry 404s (order not found / not owned by user)
      if (err instanceof Error && err.message.includes("404")) return false;
      return count < 2;
    },
  });
}

export type UseOrderDetailReturn = ReturnType<typeof useOrderDetail>;
