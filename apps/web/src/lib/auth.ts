// =============================================================================
// Auth helpers — cookie-based session for Astro SSR pages
// =============================================================================

/*import type { AstroCookies } from "astro";
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
*/

// =============================================================================
// Auth helpers — cookie-based session for Astro v6 SSR pages + auto refresh
// =============================================================================

import type { APIContext, AstroCookies } from "astro";
import { api, type User } from "./api";

const ACCESS_COOKIE = "web_access_token";
const REFRESH_COOKIE = "web_refresh_token";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "lax" as const,
  path: "/",
} satisfies Parameters<AstroCookies["set"]>[2];

type AuthResponse = {
  success: true;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

export function getTokenFromCookies(cookies: AstroCookies): string | null {
  return cookies.get(ACCESS_COOKIE)?.value ?? null;
}

export function getRefreshTokenFromCookies(
  cookies: AstroCookies
): string | null {
  return cookies.get(REFRESH_COOKIE)?.value ?? null;
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
  cookies.set(ACCESS_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
  cookies.set(REFRESH_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
}

async function tryRefreshToken(cookies: AstroCookies): Promise<string | null> {
  const refreshToken = getRefreshTokenFromCookies(cookies);
  if (!refreshToken) {
    return null;
  }

  try {
    // Sesuaikan endpoint refresh di backend kamu
    const res = await api.post<AuthResponse>("/auth/refresh", {
      refreshToken,
    });

    setAuthCookies(
      cookies,
      res.data.accessToken,
      res.data.refreshToken,
      res.data.expiresIn
    );
    return res.data.accessToken;
  } catch {
    // Refresh gagal = sesi habis total
    clearAuthCookies(cookies);
    return null;
  }
}

export async function getCurrentUser(
  cookies: AstroCookies
): Promise<User | null> {
  let token = getTokenFromCookies(cookies);
  if (!token) {
    return null;
  }

  try {
    const res = await api.get<{ success: true; data: User }>("/auth/me", {
      token,
    });
    return res.data;
  } catch (err: any) {
    // Cek kalau error karena 401 / token expired
    if (err?.status === 401 || err?.response?.status === 401) {
      // Coba refresh sekali
      token = await tryRefreshToken(cookies);
      if (!token) {
        return null;
      }

      // Retry request dengan token baru
      try {
        const res = await api.get<{ success: true; data: User }>("/auth/me", {
          token,
        });
        return res.data;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function requireAuth(
  context: APIContext,
  redirectUrl = "/auth/login"
): Promise<User> {
  const user = await getCurrentUser(context.cookies);
  if (!user) {
    return context.redirect(redirectUrl, 302);
  }
  return user;
}
