// =============================================================================
// useChangePassword — mutation for changing the current user's password
//
// Flow:
//   mutationFn → PATCH /users/me/password (authenticated via cookie proxy)
//
// Usage:
//   const mutation = useChangePassword();
//   mutation.mutate({ currentPassword, newPassword, confirmNewPassword });
// =============================================================================

import { useMutation } from "@tanstack/react-query";

import type { ChangePasswordInput } from "@repo/common/schemas";

import { apiProxy } from "@/lib/api";

export function useChangePassword() {
  return useMutation({
    mutationFn: async (vars: ChangePasswordInput) => {
      await apiProxy.patch("/users/me/password", {
        currentPassword: vars.currentPassword,
        newPassword: vars.newPassword,
        confirmNewPassword: vars.confirmNewPassword,
      });
    },
  });
}

export type UseChangePasswordReturn = ReturnType<typeof useChangePassword>;
