// =============================================================================
// useCreateAddress — mutation for adding a new shipping address
//
// Requires authentication. Returns the created StorefrontAddress in `res.data`.
//
// Usage:
//   const createAddress = useCreateAddress();
//   createAddress.mutate(formData, {
//     onSuccess: (res) => {
//       setAddresses(prev => [res.data, ...prev]);
//       notify.success("Alamat berhasil ditambahkan");
//     },
//     onError: (err) => setFormError(err.message),
//   });
// =============================================================================

import { useMutation } from "@tanstack/react-query";
import type { StorefrontAddress } from "@repo/common/types";
import type { CreateAddressInput } from "@repo/common/schemas";

import { apiProxy } from "@/lib/api";

// Re-export shared types so callers (e.g. useUpdateAddress, AddressManager)
// don't need a separate import from @repo/common.
export type Address = StorefrontAddress;
export type AddressPayload = CreateAddressInput;

interface CreateAddressResponse {
  data: StorefrontAddress;
  success: true;
}

export function useCreateAddress() {
  return useMutation({
    mutationFn: (payload: AddressPayload) =>
      apiProxy.post<CreateAddressResponse>("/users/me/addresses", {
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

export type UseCreateAddressReturn = ReturnType<typeof useCreateAddress>;
