// =============================================================================
// Auth helpers — cookie-based session for Astro SSR pages
// =============================================================================

import type { AstroCookies } from "astro";
import { api, type User } from "./api";

const ACCESS_COOKIE  = "web_access_token";
const REFRESH_COOKIE = "web_refresh_token";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "lax" as const,
  path: "/",
};

export function getTokenFromCookies(cookies: AstroCookies): string | null {
  return cookies.get(ACCESS_COOKIE)?.value ?? null;
}

export function setAuthCookies(
  cookies: AstroCookies,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  cookies.set(ACCESS_COOKIE, accessToken, {
    ...COOKIE_OPTS,
    maxAge: expiresIn,
  });
  cookies.set(REFRESH_COOKIE, refreshToken, {
    ...COOKIE_OPTS,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export function clearAuthCookies(cookies: AstroCookies) {
  cookies.delete(ACCESS_COOKIE, { path: "/" });
  cookies.delete(REFRESH_COOKIE, { path: "/" });
}

export async function getCurrentUser(cookies: AstroCookies): Promise<User | null> {
  const token = getTokenFromCookies(cookies);
  if (!token) return null;

  try {
    const res = await api.get<{ success: true; data: User }>("/auth/me", { token });
    return res.data;
  } catch {
    return null;
  }
}

export async function requireAuth(
  cookies: AstroCookies,
  redirectUrl = "/auth/login"
): Promise<User> {
  const user = await getCurrentUser(cookies);
  if (!user) {
    throw new Response(null, {
      status: 302,
      headers: { Location: redirectUrl },
    });
  }
  return user;
}

