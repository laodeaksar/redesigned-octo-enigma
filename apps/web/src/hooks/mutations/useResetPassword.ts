// =============================================================================
// useResetPassword — mutation for resetting a password using a token
//
// Flow:
//   mutationFn → POST /auth/reset-password to gateway → auth-service updates
//                the user's password and invalidates the reset token
//
// Usage:
//   const resetMutation = useResetPassword();
//   resetMutation.mutate({ token, password, confirmPassword }, { onSuccess });
// =============================================================================

import { useMutation } from "@tanstack/react-query";

import type { ResetPasswordInput } from "@repo/common/schemas";

import { api } from "@/lib/api";

export function useResetPassword() {
  return useMutation({
    mutationFn: async (vars: ResetPasswordInput) => {
      await api.post("/auth/reset-password", {
        token: vars.token,
        password: vars.password,
        confirmPassword: vars.confirmPassword,
      });
    },
  });
}

export type UseResetPasswordReturn = ReturnType<typeof useResetPassword>;
