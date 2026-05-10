// =============================================================================
// Authenticated API proxy
//
// Bridges browser-side island fetches to the internal API gateway while keeping
// the JWT token exclusively in httpOnly cookies — it never appears in rendered
// HTML, island props, or client-side JavaScript.
//
// Usage from islands:
//   import { apiProxy } from "@/lib/api";
//   const data = await apiProxy.get("/orders/me", { params: { page: 1 } });
//
// The browser sends the request to /api/proxy/<path> (same-origin, cookies are
// included automatically). This handler reads the httpOnly access token, injects
// an Authorization header, and forwards the call to the internal API gateway.
//
// Supports GET, POST, PATCH, PUT, DELETE.
// Returns the upstream HTTP status + JSON body unchanged.
// =============================================================================

import type { APIRoute } from "astro";

import { getTokenFromCookies } from "@/lib/auth";

const GATEWAY =
  (import.meta.env.INTERNAL_API_URL as string | undefined) ??
  "http://localhost:3000";

const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

export const ALL: APIRoute = async ({ request, cookies, params }) => {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const token = getTokenFromCookies(cookies);
  if (!token) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Sesi tidak ditemukan. Silakan login kembali.",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Build upstream URL ─────────────────────────────────────────────────────
  // params.path is everything after /api/proxy/ e.g. "orders/me" or "wishlist"
  const upstreamPath = params.path ?? "";
  const upstreamUrl = new URL(`${GATEWAY}/${upstreamPath}`);

  // Forward all query params from the browser request
  new URL(request.url).searchParams.forEach((value, key) =>
    upstreamUrl.searchParams.set(key, value)
  );

  // ── Forward to gateway ─────────────────────────────────────────────────────
  const method = request.method.toUpperCase();
  let upstreamRes: Response;

  try {
    upstreamRes = await fetch(upstreamUrl.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: BODY_METHODS.has(method) ? await request.text() : undefined,
    });
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "GATEWAY_UNAVAILABLE",
          message: "Layanan sementara tidak tersedia. Coba beberapa saat lagi.",
        },
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Return upstream response verbatim ─────────────────────────────────────
  const body = await upstreamRes.text();
  return new Response(body, {
    status: upstreamRes.status,
    headers: {
      "Content-Type":
        upstreamRes.headers.get("Content-Type") ?? "application/json",
    },
  });
};
