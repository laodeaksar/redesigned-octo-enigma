// =============================================================================
// GET /api/orders
// Authenticated proxy → order-service (used by review form to list orders)
// =============================================================================

import type { APIRoute } from "astro";

const GW =
  (import.meta.env.PUBLIC_API_URL as string) ?? "http://localhost:3000";

export const GET: APIRoute = async ({ url, cookies }) => {
  const token = cookies.get("web_access_token")?.value;
  if (!token) {
    return new Response(
      JSON.stringify({ success: false, error: { code: "UNAUTHORIZED" } }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const target = new URL(`${GW}/orders`);
    url.searchParams.forEach((v, k) => target.searchParams.set(k, v));

    const res = await fetch(target.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    return new Response(await res.text(), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "GATEWAY_ERROR", message: "Service unavailable" },
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
};
