// =============================================================================
// useLogin — mutation for email/password login
//
// Flow:
//   mutationFn → POST /auth/login to gateway → POST /api/auth/session (Astro
//                SSR endpoint) to set httpOnly cookies
//
// The setSession call stays as raw fetch because it targets the same-origin
// Astro API route — NOT the external gateway.
//
// Usage:
//   const loginMutation = useLogin();
//   loginMutation.mutate(
//     { email, password },
//     { onSuccess: () => { window.location.href = "/"; } }
//   );
// =============================================================================

import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { setSession, type AuthTokens } from "@/lib/session";

interface LoginVars {
  email: string;
  password: string;
}

interface LoginResponse {
  data: AuthTokens;
  success: true;
}

export function useLogin() {
  return useMutation({
    mutationFn: async (vars: LoginVars) => {
      const res = await api.post<LoginResponse>("/auth/login", {
        email: vars.email,
        password: vars.password,
      });
      await setSession(res.data);
      return res.data;
    },
  });
}

export type UseLoginReturn = ReturnType<typeof useLogin>;
