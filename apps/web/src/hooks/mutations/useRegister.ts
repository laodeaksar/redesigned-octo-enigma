// =============================================================================
// useRegister — mutation for email/password registration + auto-login
//
// Flow:
//   mutationFn → POST /auth/register → POST /auth/login (auto-login) →
//                POST /api/auth/session (Astro SSR endpoint) to set cookies
//
// Auto-login after registration is intentional UX — the user should not have
// to log in manually after creating an account.
// =============================================================================

import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { setSession, type AuthTokens } from "@/lib/session";

interface RegisterVars {
  confirmPassword: string;
  email: string;
  name: string;
  password: string;
}

interface LoginResponse {
  data: AuthTokens;
  success: true;
}

export function useRegister() {
  return useMutation({
    mutationFn: async (vars: RegisterVars) => {
      await api.post("/auth/register", {
        name: vars.name,
        email: vars.email,
        password: vars.password,
        confirmPassword: vars.confirmPassword,
      });

      // Auto-login after successful registration
      const res = await api.post<LoginResponse>("/auth/login", {
        email: vars.email,
        password: vars.password,
      });
      await setSession(res.data);
      return res.data;
    },
  });
}

export type UseRegisterReturn = ReturnType<typeof useRegister>;
