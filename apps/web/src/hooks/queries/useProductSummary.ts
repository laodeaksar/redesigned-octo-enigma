// =============================================================================
// useProductSummary — query hook for a product's rating summary
//
// Fetches from the public gateway endpoint (no auth required).
// Returns null when the product has no reviews yet.
//
// Usage:
//   const { data: summary, isPending } = useProductSummary(productId);
//   summary?.average  // 4.3
//   summary?.count    // 17
//   summary?.breakdown // { "5": 10, "4": 5, "3": 2 }
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

// ── Schema ────────────────────────────────────────────────────────────────────

export const ratingSummarySchema = z.object({
  average: z.number(),
  breakdown: z.record(z.string(), z.number()),
  count: z.number(),
});

export type RatingSummary = z.infer<typeof ratingSummarySchema>;

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useProductSummary(productId: string) {
  return useQuery<RatingSummary | null>({
    queryKey: queryKeys.reviews.summary(productId),
    queryFn: async () => {
      const res = await api.get<{ success: true; data: unknown }>(
        `/products/${productId}/summary`
      );
      if (!res.data) return null;
      return ratingSummarySchema.parse(res.data);
    },
    staleTime: 60 * 1000,
  });
}

export type UseProductSummaryReturn = ReturnType<typeof useProductSummary>;
