// =============================================================================
// useSetPassword — mutation for setting a password on an OAuth-only account
//
// OAuth accounts (Google, GitHub) have no passwordHash. This calls
// POST /users/me/password to add password authentication to the account,
// allowing the user to also sign in with email + password going forward.
// =============================================================================

import { useMutation } from "@tanstack/react-query";

import type { SetPasswordInput } from "@repo/common/schemas";

import { apiProxy } from "@/lib/api";

export function useSetPassword() {
  return useMutation({
    mutationFn: async (vars: SetPasswordInput) => {
      await apiProxy.post("/users/me/password", {
        newPassword: vars.newPassword,
        confirmNewPassword: vars.confirmNewPassword,
      });
    },
  });
}

export type UseSetPasswordReturn = ReturnType<typeof useSetPassword>;
