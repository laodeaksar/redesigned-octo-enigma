// =============================================================================
// useRequestRefund — mutation hook for submitting a refund request on a
// delivered order.
//
// Flow: validate with requestRefundSchema → POST /orders/:id/refund
//       → notify.success + invalidate order cache
//       → component handles dialog close + redirect on call-site onSuccess
//
// Schema (from @repo/common):
//   reason:    RefundReason enum (defective_product | wrong_item | …)
//   note:      string (max 1000, optional)
//   imageUrls: string[] (max 5, optional — image upload is a future feature)
//
// Usage:
//   const refundMutation = useRequestRefund(orderId, orderNumber);
//   refundMutation.mutate(
//     { reason: "defective_product", note: "…", imageUrls: [] },
//     { onSuccess: () => { closeDialog(); redirectAfterDelay(); } }
//   );
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  requestRefundSchema,
  type RequestRefundInput,
} from "@repo/common/schemas";

import { apiProxy } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { notify } from "@/lib/toast";

export function useRequestRefund(orderId: string, orderNumber: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: RequestRefundInput) => {
      // Validate against @repo/common schema before hitting the wire
      const payload = requestRefundSchema.parse(input);
      return apiProxy.post(`/orders/${orderId}/refund`, payload);
    },

    onSuccess: () => {
      notify.success(
        `Permintaan refund untuk ${orderNumber} berhasil dikirim`,
        "Tim kami akan meninjaunya dalam 3–5 hari kerja."
      );
      // Invalidate so order detail + list reflect the new "refund_requested" status
      void qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      void qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
    },

    onError: (err: Error) => {
      notify.error(
        "Gagal mengirim permintaan refund",
        err.message || "Silakan coba lagi atau hubungi dukungan kami."
      );
    },
  });
}

export type UseRequestRefundReturn = ReturnType<typeof useRequestRefund>;
