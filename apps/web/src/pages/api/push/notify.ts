// =============================================================================
// Internal push notification endpoint — called by API gateway after status updates
// Only accessible from localhost / trusted internal callers
// =============================================================================

import type { APIRoute } from "astro";
import { sendOrderStatusPush } from "@/lib/push.server";

const INTERNAL_KEY = process.env.INTERNAL_NOTIFY_KEY ?? "push-notify-internal";

export const POST: APIRoute = async ({ request }) => {
  // Verify internal caller via secret key header
  const callerKey = request.headers.get("x-internal-key");
  if (callerKey !== INTERNAL_KEY) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  let body: { orderId: string; status: string; orderNumber?: string | null };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  if (!body?.orderId || !body?.status) {
    return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
  }

  // Fire-and-forget: send push notifications async
  sendOrderStatusPush(body.orderId, body.status, body.orderNumber).catch((err) =>
    console.warn("[push/notify] Failed to send push:", err?.message)
  );

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
