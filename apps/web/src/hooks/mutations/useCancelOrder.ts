// =============================================================================
// useCancelOrder — mutation hook for cancelling a customer's pending_payment order
//
// Flow: validate with cancelOrderSchema → POST /orders/:id/cancel
//       → notify.success + invalidate order cache
//       → component handles dialog close + redirect on call-site onSuccess
//
// Usage:
//   const cancelMutation = useCancelOrder(orderId, orderNumber);
//   cancelMutation.mutate(
//     { reason: "customer_request", note: "Berubah pikiran" },
//     { onSuccess: () => { closeDialog(); redirectAfterDelay(); } }
//   );
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  cancelOrderSchema,
  type CancelOrderInput,
} from "@repo/common/schemas";

import { apiProxy } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { notify } from "@/lib/toast";

export function useCancelOrder(orderId: string, orderNumber: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CancelOrderInput) => {
      // Validate against @repo/common schema before hitting the wire
      const payload = cancelOrderSchema.parse(input);
      return apiProxy.post(`/orders/${orderId}/cancel`, payload);
    },

    onSuccess: () => {
      notify.success(
        `Pesanan ${orderNumber} berhasil dibatalkan`,
        "Stok produk dikembalikan secara otomatis."
      );
      // Invalidate the specific order detail + the list so both reflect "cancelled"
      void qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      void qc.invalidateQueries({ queryKey: queryKeys.orders.all() });
    },

    onError: (err: Error) => {
      notify.error(
        "Gagal membatalkan pesanan",
        err.message || "Silakan coba lagi atau hubungi dukungan kami."
      );
    },
  });
}

export type UseCancelOrderReturn = ReturnType<typeof useCancelOrder>;
