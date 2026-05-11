// =============================================================================
// useForgotPassword — mutation for requesting a password reset email
//
// Flow:
//   mutationFn → POST /auth/forgot-password to gateway → auth-service sends
//                reset email to the provided address
//
// Usage:
//   const forgotMutation = useForgotPassword();
//   forgotMutation.mutate({ email }, { onSuccess, onError });
// =============================================================================

import { useMutation } from "@tanstack/react-query";

import type { ForgotPasswordInput } from "@repo/common/schemas";

import { api } from "@/lib/api";

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (vars: ForgotPasswordInput) => {
      await api.post("/auth/forgot-password", { email: vars.email });
    },
  });
}

export type UseForgotPasswordReturn = ReturnType<typeof useForgotPassword>;
