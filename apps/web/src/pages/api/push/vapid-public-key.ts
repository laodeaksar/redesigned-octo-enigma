import type { APIRoute } from "astro";

import { VAPID_PUBLIC_KEY } from "@/lib/push.server";

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ publicKey: VAPID_PUBLIC_KEY }), {
    headers: { "Content-Type": "application/json" },
  });
