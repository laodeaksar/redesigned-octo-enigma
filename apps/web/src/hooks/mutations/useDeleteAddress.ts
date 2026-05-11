// =============================================================================
// useDeleteAddress — mutation for removing a shipping address
//
// Requires authentication.
//
// Usage:
//   const deleteAddress = useDeleteAddress();
//   deleteAddress.mutate(address.id, {
//     onSuccess: () => {
//       setAddresses(prev => prev.filter(a => a.id !== id));
//       notify.success("Alamat berhasil dihapus");
//     },
//     onError: (err) => notify.error(err.message),
//   });
// =============================================================================

import { useMutation } from "@tanstack/react-query";

import { apiProxy } from "@/lib/api";

export function useDeleteAddress() {
  return useMutation({
    mutationFn: (id: string) => apiProxy.delete(`/users/me/addresses/${id}`),
  });
}

export type UseDeleteAddressReturn = ReturnType<typeof useDeleteAddress>;
