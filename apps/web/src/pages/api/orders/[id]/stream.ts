import type { APIRoute } from "astro";

import { sendOrderStatusPush } from "@/lib/push.server";

const GW =
  (import.meta.env.PUBLIC_API_URL as string) ?? "http://localhost:3000";

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

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      signal: request.signal,
    });
  } catch {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ code: "SERVICE_UNAVAILABLE" })}\n\n`,
      { status: 503, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  if (!(upstream.ok && upstream.body)) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ code: "UPSTREAM_ERROR", status: upstream.status })}\n\n`,
      {
        status: upstream.status,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }

  // ── Transform stream: parse events to detect status changes and trigger push
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const decoder = new TextDecoder();

  (async () => {
    const reader = upstream.body!.getReader();
    let buffer = "";
    let lastStatus = "";
    let eventName = "";
    let eventData = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        // Forward raw bytes to client unchanged
        await writer.write(value);

        // Also parse the SSE text to detect order-update events
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventName = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            eventData = line.slice(6).trim();
          } else if (line === "") {
            // End of one SSE event
            if (eventName === "order-update" && eventData) {
              try {
                const parsed = JSON.parse(eventData) as {
                  status?: string;
                  orderNumber?: string;
                };
                if (parsed.status && parsed.status !== lastStatus) {
                  const prev = lastStatus;
                  lastStatus = parsed.status;
                  // Only push for genuine status transitions (not first event)
                  if (prev !== "") {
                    sendOrderStatusPush(
                      id!,
                      parsed.status,
                      parsed.orderNumber
                    ).catch(() => {});
                  }
                }
              } catch {}
            }
            eventName = "";
            eventData = "";
          }
        }
      }
    } catch {
      // Client disconnected or upstream closed — normal
    } finally {
      writer.close().catch(() => {});
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
};
