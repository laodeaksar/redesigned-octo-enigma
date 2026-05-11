// =============================================================================
// useProductReviews — query hook for a product's paginated review list
//
// Fetches from the public gateway endpoint (no auth required).
// For infinite scroll / load-more, call loadMore() which appends the next page
// to extraReviews — useInfiniteQuery upgrade can be done in a later phase.
//
// Usage:
//   const { data, isPending } = useProductReviews(productId, 1);
//   const reviews = data?.data ?? [];
//   const hasMore = data?.meta.hasNextPage ?? false;
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

// ── Schema ────────────────────────────────────────────────────────────────────

export const reviewSchema = z.object({
  body: z.string().nullable(),
  createdAt: z.string(),
  id: z.string(),
  imageUrls: z.array(z.string()),
  isVerifiedPurchase: z.boolean(),
  rating: z.number(),
  title: z.string().nullable(),
  userId: z.string(),
});

export const reviewsPageSchema = z.object({
  data: z.array(reviewSchema),
  meta: z.object({
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean().optional(),
    limit: z.number().optional(),
    page: z.number().optional(),
    total: z.number().optional(),
    totalPages: z.number().optional(),
  }),
  success: z.literal(true),
});

export type Review = z.infer<typeof reviewSchema>;
export type ReviewsPage = z.infer<typeof reviewsPageSchema>;

// ── Hook ─────────────────────────────────────────────────────────────────────

const REVIEWS_PER_PAGE = 10;

export function useProductReviews(productId: string, page = 1) {
  return useQuery<ReviewsPage>({
    queryKey: queryKeys.reviews.list(productId, page),
    queryFn: async () => {
      const res = await api.get<unknown>(`/products/${productId}/reviews`, {
        params: { page, limit: REVIEWS_PER_PAGE },
      });
      return reviewsPageSchema.parse(res);
    },
    staleTime: 60 * 1000,
  });
}

export type UseProductReviewsReturn = ReturnType<typeof useProductReviews>;
