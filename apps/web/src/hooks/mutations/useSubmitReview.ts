// =============================================================================
// useSubmitReview — mutation for submitting a product review
//
// Requires authentication (uses apiProxy for cookie-auth forwarding).
// On success: invalidates both the rating summary and review list for the
// product so the UI reflects the new review immediately.
//
// Usage:
//   const submitMutation = useSubmitReview(productId);
//   submitMutation.mutate({ orderId, rating, title, body });
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiProxy } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { notify } from "@/lib/toast";

interface SubmitReviewVars {
  body: string | null;
  orderId: string;
  rating: number;
  title: string | null;
}

export function useSubmitReview(productId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: SubmitReviewVars) =>
      apiProxy.post(`/products/${productId}/reviews`, vars),

    onSuccess: () => {
      notify.success("Ulasan berhasil dikirim. Terima kasih!");
      // Invalidate parent key → purges summary + list for this product
      void qc.invalidateQueries({
        queryKey: queryKeys.reviews.forProduct(productId),
      });
    },

    onError: (err: Error) => {
      notify.error(
        "Gagal mengirim ulasan",
        err.message ?? "Pastikan kamu sudah membeli produk ini."
      );
    },
  });
}

export type UseSubmitReviewReturn = ReturnType<typeof useSubmitReview>;
