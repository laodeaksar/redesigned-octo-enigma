// =============================================================================
// useProductReviews — infinite query hook for a product's paginated review list
//
// Fetches from the public gateway endpoint (no auth required).
// Uses useInfiniteQuery so each "load more" appends the next page to the cache
// without replacing existing pages — no manual state management needed.
//
// Usage:
//   const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage }
//     = useProductReviews(productId);
//
//   const reviews = data?.pages.flatMap(p => p.data) ?? [];
//   const hasMore = hasNextPage ?? false;
// =============================================================================

import { useInfiniteQuery } from "@tanstack/react-query";
import type { StorefrontReview } from "@repo/common/types";
import { reviewsPageSchema, type ReviewsPage } from "@repo/common/schemas";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

// Re-export shared type so callers don't need a second import
export type Review = StorefrontReview;
export type { ReviewsPage };

// ── Hook ─────────────────────────────────────────────────────────────────────

const REVIEWS_PER_PAGE = 10;

export function useProductReviews(productId: string) {
  return useInfiniteQuery<ReviewsPage>({
    queryKey: queryKeys.reviews.infinite(productId),
    queryFn: async ({ pageParam }) => {
      const res = await api.get<unknown>(`/products/${productId}/reviews`, {
        params: { page: pageParam as number, limit: REVIEWS_PER_PAGE },
      });
      return reviewsPageSchema.parse(res);
    },
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 60 * 1000,
  });
}

export type UseProductReviewsReturn = ReturnType<typeof useProductReviews>;
