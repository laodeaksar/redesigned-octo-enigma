// =============================================================================
// Auth store — React context + TanStack Query for server state
// =============================================================================

import React, {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  login as apiLogin,
  logout as apiLogout,
  getMe,
  type AdminUser,
} from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthState {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

// ── Query keys ────────────────────────────────────────────────────────────────

export const authKeys = {
  me: ["auth", "me"] as const,
};

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user = null, isLoading } = useQuery({
    queryKey: authKeys.me,
    queryFn: getMe,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const loggedInUser = await apiLogin(email, password);
      queryClient.setQueryData(authKeys.me, loggedInUser);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    queryClient.setQueryData(authKeys.me, null);
    queryClient.clear();
  }, [queryClient]);

  const value: AuthState = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
