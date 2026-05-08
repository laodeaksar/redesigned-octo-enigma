// =============================================================================
// Auth helpers — login, logout, session state
// =============================================================================

import { api, clearTokens, getAccessToken, setTokens } from "./api";
import type { ApiResponse } from "./api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  avatarUrl: string | null;
  createdAt: string;
  email: string;
  emailVerified: boolean;
  id: string;
  name: string;
  role: "admin" | "super_admin";
  status: string;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: AdminUser;
}

// ── Auth actions ──────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string
): Promise<AdminUser> {
  const res = await api.post<ApiResponse<LoginResponse>>(
    "/auth/login",
    { email, password },
    { skipAuth: true }
  );

  const { user, accessToken, refreshToken } = res.data;

  // Only allow admin+ users into the admin panel
  if (user.role !== "admin" && user.role !== "super_admin") {
    throw new Error("Access denied: admin privileges required");
  }

  setTokens(accessToken, refreshToken);
  return user;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout", {});
  } finally {
    clearTokens();
  }
}

export async function getMe(): Promise<AdminUser | null> {
  if (!getAccessToken()) {
    return null;
  }

  try {
    const res = await api.get<ApiResponse<AdminUser>>("/auth/me");
    return res.data;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
