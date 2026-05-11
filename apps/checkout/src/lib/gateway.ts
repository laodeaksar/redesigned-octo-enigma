// =============================================================================
// Gateway fetch helper
//
// All checkout proxy calls go through the API gateway so that existing
// auth middleware, rate limiting, and audit logging remain in place.
//
// NOTE: This is intentionally simpler than api-gateway's full circuit-breaker
// proxy. Add circuit-breaker logic here when this service is activated.
// =============================================================================

import type { Context } from "hono";

import { env } from "@/config";
import type { VerifiedUser } from "@/lib/jwt";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

export interface GatewayRequestOptions {
  /** Extra headers to merge in */
  extraHeaders?: Record<string, string>;
  /** Override HTTP method */
  method?: string;
  /** Authenticated user — forwarded as Authorization: Bearer <token> */
  user?: VerifiedUser | null;
  /** Raw JWT string — forwarded to gateway so it can re-verify if needed */
  rawToken?: string | null;
}

/**
 * Forward the current Hono request to the API gateway and return the upstream
 * response verbatim (status code, headers, body streaming).
 *
 * Gateway path is derived by stripping the `/checkout` prefix from the request
 * path, then appending query string.
 *
 * Example: `GET /checkout/cart` → `GET http://gateway/cart`
 */
export async function forwardToGateway(
  c: Context,
  options: GatewayRequestOptions = {}
): Promise<Response> {
  const { user, rawToken, extraHeaders = {}, method } = options;

  const url = new URL(c.req.url);
  const path = url.pathname.replace(/^\/checkout/, "") || "/";
  const target = `${env.API_GATEWAY_URL}${path}${url.search}`;

  const headers = new Headers();

  for (const [key, value] of c.req.raw.headers.entries()) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  // Forward the JWT to the gateway so its auth middleware can verify it
  if (rawToken) {
    headers.set("Authorization", `Bearer ${rawToken}`);
  }

  // Scrub any x-user-* headers a malicious client might inject
  if (!user) {
    headers.delete("x-user-id");
    headers.delete("x-user-email");
    headers.delete("x-user-role");
  }

  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  headers.set("x-request-id", requestId);
  headers.set("x-forwarded-for", getClientIp(c));
  headers.set("x-forwarded-host", c.req.header("host") ?? "");
  headers.set("x-forwarded-service", "checkout");

  for (const [k, v] of Object.entries(extraHeaders)) {
    headers.set(k, v);
  }

  const requestMethod = method ?? c.req.method;
  const body =
    requestMethod !== "GET" && requestMethod !== "HEAD"
      ? c.req.raw.body
      : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: requestMethod,
      headers,
      body,
      duplex: "half",
    });
  } catch (err) {
    console.error(`[gateway] Upstream fetch failed: ${target}`, err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Gateway unavailable",
        message: "Checkout service could not reach the API gateway",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("x-request-id", requestId);
  for (const header of HOP_BY_HOP) {
    responseHeaders.delete(header);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

function getClientIp(c: Context): string {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-real-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
