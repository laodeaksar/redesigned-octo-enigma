// =============================================================================
// API client — typed fetch wrapper → api-gateway
// =============================================================================

import { env } from "@repo/env/admin";

const BASE_URL = env.VITE_API_URL;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

// ── Token management ──────────────────────────────────────────────────────────

let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  _accessToken = access;
  _refreshToken = refresh;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
  }
}

export function clearTokens() {
  _accessToken = null;
  _refreshToken = null;
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }
}

export function getAccessToken(): string | null {
  if (_accessToken) return _accessToken;
  if (typeof localStorage !== "undefined") {
    _accessToken = localStorage.getItem("access_token");
  }
  return _accessToken;
}

function getRefreshToken(): string | null {
  if (_refreshToken) return _refreshToken;
  if (typeof localStorage !== "undefined") {
    _refreshToken = localStorage.getItem("refresh_token");
  }
  return _refreshToken;
}

// ── Refresh token logic ───────────────────────────────────────────────────────

let _refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // Deduplicate concurrent refresh calls
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        clearTokens();
        return null;
      }

      const json = (await res.json()) as ApiResponse<{
        accessToken: string;
        refreshToken: string;
      }>;

      setTokens(json.data.accessToken, json.data.refreshToken);
      return json.data.accessToken;
    } catch {
      clearTokens();
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// ── Core fetch ────────────────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  /** Skip auth header */
  skipAuth?: boolean;
  /** Query params object */
  params?: Record<string, string | number | boolean | undefined | null>;
}

async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, params, ...fetchOptions } = options;

  // Build URL with query params
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers = new Headers(fetchOptions.headers);
  headers.set("Content-Type", "application/json");

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(url.toString(), { ...fetchOptions, headers });

  // Auto-refresh on 401 TOKEN_EXPIRED
  if (res.status === 401 && !skipAuth) {
    const body = (await res.clone().json().catch(() => ({}))) as ApiError;
    if (body.error?.code === "TOKEN_EXPIRED") {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        res = await fetch(url.toString(), { ...fetchOptions, headers });
      }
    }
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({
      success: false,
      error: { code: "UNKNOWN_ERROR", message: res.statusText },
    }))) as ApiError;
    throw new ApiRequestError(
      errBody.error?.code ?? "UNKNOWN_ERROR",
      errBody.error?.message ?? "Request failed",
      res.status,
      errBody.error?.details
    );
  }

  return res.json() as Promise<T>;
}

// ── HTTP method helpers ───────────────────────────────────────────────────────

export const api = {
  get<T>(path: string, options?: FetchOptions) {
    return apiFetch<T>(path, { ...options, method: "GET" });
  },
  post<T>(path: string, body: unknown, options?: FetchOptions) {
    return apiFetch<T>(path, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  patch<T>(path: string, body: unknown, options?: FetchOptions) {
    return apiFetch<T>(path, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  delete<T>(path: string, options?: FetchOptions) {
    return apiFetch<T>(path, { ...options, method: "DELETE" });
  },
};

