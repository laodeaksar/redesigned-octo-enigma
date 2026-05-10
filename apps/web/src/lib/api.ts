// =============================================================================
// API client — server-side (Astro pages) + client-side (React islands)
//
// URL strategy:
//   SSR (Astro frontmatter, API routes) → INTERNAL_API_URL
//     Stays inside the private network, avoids a round-trip through the public
//     internet and skips any TLS / CDN overhead.  Falls back to localhost:3000
//     so local dev needs zero config.
//
//   CSR (React islands running in the browser) → PUBLIC_API_URL
//     Must be reachable from the user's browser.
//
// import.meta.env.SSR is set to `true` by Vite/Astro for SSR builds and
// `false` for client bundles, so the unused branch is tree-shaken away.
// =============================================================================

import type {
  StorefrontCategory,
  StorefrontOrder,
  StorefrontOrderDetail,
  StorefrontPayment,
  StorefrontProduct,
  StorefrontProductDetail,
  StorefrontRatingSummary,
  StorefrontReview,
  StorefrontUser,
  StorefrontWishlistItem,
} from "@repo/common/types";

// ── Base URL ──────────────────────────────────────────────────────────────────

const BASE = import.meta.env.SSR
  ? (import.meta.env.INTERNAL_API_URL ?? "http://localhost:3000")
  : (import.meta.env.PUBLIC_API_URL ?? "http://localhost:3000");

// ── Response shapes ───────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: true;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
  success: true;
}

// ── Error ─────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Core fetch ────────────────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  token?: string;
}

async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, params, ...init } = options;

  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url.toString(), { ...init, headers });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({
      error: { code: "UNKNOWN", message: res.statusText },
    }))) as { error?: { code?: string; message?: string } };
    throw new ApiError(
      body.error?.code ?? "UNKNOWN",
      body.error?.message ?? res.statusText,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),

  post: <T>(path: string, body: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "POST", body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body: JSON.stringify(body) }),

  delete: <T>(path: string, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
};

// ── Authenticated proxy client ────────────────────────────────────────────────
//
// Use in React islands instead of `api.xxx({ token })`.
// Calls /api/proxy/<path> on the same Astro origin — the server reads the JWT
// from the httpOnly cookie and injects it before forwarding to the gateway.
// The access token never appears in island props or client-side HTML.
//
// Example:
//   const data = await apiProxy.get("/orders/me", { params: { limit: 5 } });
//   await apiProxy.post("/orders", { items, shippingAddressId });
//   await apiProxy.delete(`/wishlist/${productId}`);

type ProxyOptions = Omit<FetchOptions, "token">;

async function proxyFetch<T>(
  path: string,
  options: ProxyOptions = {}
): Promise<T> {
  const { params, ...init } = options;

  // Always same-origin (browser). The SSR branch is a safety guard only —
  // apiProxy should never be called during server-side rendering.
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:5000";

  const url = new URL(`${origin}/api/proxy${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const res = await fetch(url.toString(), { ...init, headers });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({
      error: { code: "UNKNOWN", message: res.statusText },
    }))) as { error?: { code?: string; message?: string } };
    throw new ApiError(
      body.error?.code ?? "UNKNOWN",
      body.error?.message ?? res.statusText,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

export const apiProxy = {
  get: <T>(path: string, opts?: ProxyOptions) =>
    proxyFetch<T>(path, { ...opts, method: "GET" }),

  post: <T>(path: string, body: unknown, opts?: ProxyOptions) =>
    proxyFetch<T>(path, {
      ...opts,
      method: "POST",
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown, opts?: ProxyOptions) =>
    proxyFetch<T>(path, {
      ...opts,
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string, opts?: ProxyOptions) =>
    proxyFetch<T>(path, { ...opts, method: "DELETE" }),
};

// ── Domain type re-exports ────────────────────────────────────────────────────
//
// Canonical definitions live in packages/common/types/storefront.ts — the
// single source of truth for API response shapes across all storefront clients.
//
// These aliases keep every .astro page and React island unchanged: they still
// import `{ Product, Category, ... }` from "@/lib/api" and nothing breaks.

export type Product = StorefrontProduct;
export type ProductDetail = StorefrontProductDetail;
export type Category = StorefrontCategory;
export type Order = StorefrontOrder;
export type OrderDetail = StorefrontOrderDetail;
export type User = StorefrontUser;
export type Payment = StorefrontPayment;
export type WishlistItem = StorefrontWishlistItem;
export type Review = StorefrontReview;
export type RatingSummary = StorefrontRatingSummary;
