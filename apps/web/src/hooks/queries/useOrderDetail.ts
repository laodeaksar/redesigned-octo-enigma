// =============================================================================
// useOrderDetail — query hook for a single order's full details
//
// Fetches from /api/proxy/orders/:id (authenticated via httpOnly cookie proxy).
// Returns the full StorefrontOrderDetail including items, shipping, pricing,
// payment info, and status history.
//
// Supports:
//   - initialData  — pass SSR-fetched order so the island renders immediately
//                    with no loading flash (hydration pattern)
//   - refetchInterval — set a number (ms) to enable polling; the hook
//                       automatically stops polling when the order reaches a
//                       terminal state (completed / cancelled / refunded) even
//                       if a non-false interval was provided
//
// Usage:
//   // Basic (lazy fetch)
//   const { data, isPending } = useOrderDetail(orderId);
//
//   // Polling with SSR hydration (OrderDetailIsland pattern)
//   const { data, isFetching } = useOrderDetail(orderId, {
//     initialData: initialOrder,
//     refetchInterval: 30_000,
//   });
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import type { StorefrontOrderDetail } from "@repo/common/types";

import { apiProxy } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

const TERMINAL = new Set(["completed", "cancelled", "refunded"]);

interface UseOrderDetailOptions {
  enabled?: boolean;
  /** Pre-fetched SSR order data — prevents loading state on first render */
  initialData?: StorefrontOrderDetail;
  /**
   * Polling interval in ms. The hook stops automatically when the order
   * reaches a terminal state regardless of this value.
   * Pass `false` or omit to disable polling.
   */
  refetchInterval?: number | false;
}

export function useOrderDetail(
  orderId: string,
  options: UseOrderDetailOptions = {}
) {
  const { enabled = true, initialData, refetchInterval = false } = options;

  return useQuery<StorefrontOrderDetail>({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: async () => {
      const res = await apiProxy.get<{
        success: true;
        data: StorefrontOrderDetail;
      }>(`/orders/${orderId}`);
      return res.data;
    },
    enabled: !!orderId && enabled,
    staleTime: 20 * 1000,
    initialData,
    // Stop polling automatically once the order is in a terminal state,
    // even if the caller passed a non-false refetchInterval.
    refetchInterval: (query) => {
      if (!refetchInterval) return false;
      const status = query.state.data?.status ?? "";
      return TERMINAL.has(status) ? false : refetchInterval;
    },
    retry: (count, err: unknown) => {
      if (err instanceof Error && err.message.includes("404")) return false;
      return count < 2;
    },
  });
}

export type UseOrderDetailReturn = ReturnType<typeof useOrderDetail>;
