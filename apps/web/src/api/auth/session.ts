// =============================================================================
// POST /api/auth/session — set httpOnly cookies after client-side login
// Called by AuthForm island after receiving tokens from /auth/login
// =============================================================================

import type { APIRoute } from "astro";
import { setAuthCookies } from "@/lib/auth";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { accessToken, refreshToken, expiresIn } = await request.json() as {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "Missing tokens" }), { status: 400 });
    }

    setAuthCookies(cookies, accessToken, refreshToken, expiresIn);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }
};

