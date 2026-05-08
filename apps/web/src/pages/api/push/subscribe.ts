import type { APIRoute } from "astro";

import { api } from "@/lib/api";
import { getTokenFromCookies } from "@/lib/auth";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/lib/push.server";

// POST /api/push/subscribe — save a push subscription
export const POST: APIRoute = async ({ request, cookies }) => {
  const token = getTokenFromCookies(cookies);
  if (!token) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: {
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    orderId: string;
    orderNumber?: string;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!(body?.subscription?.endpoint && body?.orderId)) {
    return json({ error: "Missing fields" }, 400);
  }

  // Get authenticated user
  let user: { id: string } | null = null;
  try {
    const res = await api.get<{ success: true; data: { id: string } }>(
      "/auth/me",
      { token }
    );
    user = res.data;
  } catch {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    await savePushSubscription({
      userId: user.id,
      orderId: body.orderId,
      orderNumber: body.orderNumber,
      endpoint: body.subscription.endpoint,
      p256dh: body.subscription.keys.p256dh,
      auth: body.subscription.keys.auth,
    });
    return json({ success: true });
  } catch (err) {
    console.error("[push/subscribe] DB error:", err);
    return json({ error: "Internal error" }, 500);
  }
};

// DELETE /api/push/subscribe — unsubscribe
export const DELETE: APIRoute = async ({ request, cookies }) => {
  const token = getTokenFromCookies(cookies);
  if (!token) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: { endpoint: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body?.endpoint) {
    return json({ error: "Missing endpoint" }, 400);
  }

  try {
    await removePushSubscription(body.endpoint);
    return json({ success: true });
  } catch {
    return json({ error: "Internal error" }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
