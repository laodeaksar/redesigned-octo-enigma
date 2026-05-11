// =============================================================================
// useUpdateAddress — mutation for editing an existing shipping address
//
// Requires authentication. Returns the updated StorefrontAddress in `res.data`.
//
// Usage:
//   const updateAddress = useUpdateAddress();
//   updateAddress.mutate({ id: address.id, payload: formData }, {
//     onSuccess: (res) => {
//       setAddresses(prev => prev.map(a => a.id === res.data.id ? res.data : a));
//       notify.success("Alamat berhasil diperbarui");
//     },
//     onError: (err) => setFormError(err.message),
//   });
// =============================================================================

import { useMutation } from "@tanstack/react-query";
import type { StorefrontAddress } from "@repo/common/types";
import type { CreateAddressInput } from "@repo/common/schemas";

import { apiProxy } from "@/lib/api";

interface UpdateAddressVars {
  id: string;
  payload: CreateAddressInput;
}

interface UpdateAddressResponse {
  data: StorefrontAddress;
  success: true;
}

export function useUpdateAddress() {
  return useMutation({
    mutationFn: ({ id, payload }: UpdateAddressVars) =>
      apiProxy.patch<UpdateAddressResponse>(`/users/me/addresses/${id}`, {
        label: payload.label,
        recipientName: payload.recipientName,
        phone: payload.phone,
        street: payload.street,
        city: payload.city,
        province: payload.province,
        postalCode: payload.postalCode,
        cityId: payload.cityId || undefined,
        isDefault: payload.isDefault,
      }),
  });
}

export type UseUpdateAddressReturn = ReturnType<typeof useUpdateAddress>;
