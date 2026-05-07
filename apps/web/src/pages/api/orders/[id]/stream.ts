import type { APIRoute } from "astro";

const GW = (import.meta.env.PUBLIC_API_URL as string) ?? "http://localhost:3000";

export const GET: APIRoute = async ({ params, cookies, request }) => {
  const token = cookies.get("web_access_token")?.value;
  if (!token) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ code: "UNAUTHORIZED" })}\n\n`,
      { status: 401, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const { id } = params;
  const upstreamUrl = `${GW}/orders/${id}/stream`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      signal: request.signal,
    });

    if (!upstream.ok || !upstream.body) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ code: "UPSTREAM_ERROR", status: upstream.status })}\n\n`,
        { status: upstream.status, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ code: "SERVICE_UNAVAILABLE" })}\n\n`,
      { status: 503, headers: { "Content-Type": "text/event-stream" } }
    );
  }
};
