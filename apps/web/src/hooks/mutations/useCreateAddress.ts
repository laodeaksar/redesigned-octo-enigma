// =============================================================================
// useCreateAddress — mutation for adding a new shipping address
//
// Requires authentication. Returns the created Address object in `res.data`.
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

import { apiProxy } from "@/lib/api";

export interface AddressPayload {
  city: string;
  cityId?: string;
  isDefault: boolean;
  label: string;
  phone: string;
  postalCode: string;
  province: string;
  recipientName: string;
  street: string;
}

export interface Address {
  city: string;
  cityId: string | null;
  country: string;
  id: string;
  isDefault: boolean;
  label: string;
  phone: string;
  postalCode: string;
  province: string;
  recipientName: string;
  street: string;
}

interface CreateAddressResponse {
  data: Address;
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
