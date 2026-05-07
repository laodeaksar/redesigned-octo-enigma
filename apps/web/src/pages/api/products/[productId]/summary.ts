// =============================================================================
// GET /api/products/:productId/summary
// Public proxy → product-service rating summary
// =============================================================================

import type { APIRoute } from "astro";

const GW = (import.meta.env.PUBLIC_API_URL as string) ?? "http://localhost:3000";

export const GET: APIRoute = async ({ params }) => {
  try {
    const res = await fetch(`${GW}/products/${params.productId}/reviews/summary`);
    return new Response(await res.text(), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: { code: "GATEWAY_ERROR", message: "Service unavailable" } }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
};
