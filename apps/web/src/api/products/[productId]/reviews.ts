// =============================================================================
// /api/products/:productId/reviews
// GET  — public proxy → product-service (no auth needed)
// POST — authenticated proxy (reads httpOnly cookie, injects Bearer header)
// =============================================================================

import type { APIRoute } from "astro";

const GW =
  (import.meta.env.PUBLIC_API_URL as string) ?? "http://localhost:3000";

export const GET: APIRoute = async ({ params, url }) => {
  const target = new URL(`${GW}/products/${params.productId}/reviews`);
  url.searchParams.forEach((v, k) => target.searchParams.set(k, v));

  try {
    const res = await fetch(target.toString());
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

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const token = cookies.get("web_access_token")?.value;
  if (!token) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Login diperlukan" },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.text();
    const res = await fetch(`${GW}/products/${params.productId}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
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
