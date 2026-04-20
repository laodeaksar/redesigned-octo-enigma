// =============================================================================
// Reverse proxy helper
// Forwards an incoming Hono request to a downstream service,
// injects x-user-* headers, and streams the response back.
// =============================================================================

import type { Context } from "hono";
import { ServiceUnavailableError } from "@repo/common/errors";
import type { VerifiedUser } from "@/lib/jwt";

export interface ProxyOptions {
  /** Full target URL (service base + path) */
  target: string;
  /** Authenticated user — injected as x-user-* headers if provided */
  user?: VerifiedUser | null;
  /** Extra headers to forward */
  extraHeaders?: Record<string, string>;
  /** Override the request method */
  method?: string;
}

/**
 * Forward the current Hono request to `target` and return the response.
 *
 * - Copies method, body, and most headers
 * - Injects x-user-id / x-user-email / x-user-role if user is provided
 * - Forwards x-request-id for distributed tracing
 * - Strips hop-by-hop headers before forwarding
 */
export async function proxyRequest(
  c: Context,
  options: ProxyOptions
): Promise<Response> {
  const { target, user, extraHeaders = {}, method } = options;

  // ── Build forwarded headers ────────────────────────────────────────────────
  const headers = new Headers();

  // Copy safe incoming headers
  const HOP_BY_HOP = new Set([
    "connection", "keep-alive", "proxy-authenticate",
    "proxy-authorization", "te", "trailers",
    "transfer-encoding", "upgrade",
    // Strip auth header — downstream services use x-user-* instead
    "authorization",
  ]);

  for (const [key, value] of c.req.raw.headers.entries()) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  // Inject authenticated user context
  if (user) {
    headers.set("x-user-id", user.id);
    headers.set("x-user-email", user.email);
    headers.set("x-user-role", user.role);
  } else {
    // Scrub any x-user-* headers a malicious client might inject
    headers.delete("x-user-id");
    headers.delete("x-user-email");
    headers.delete("x-user-role");
  }

  // Forward request ID for tracing
  const requestId = c.req.header("x-request-id") ??
    crypto.randomUUID();
  headers.set("x-request-id", requestId);
  headers.set("x-forwarded-for", getClientIp(c));
  headers.set("x-forwarded-host", c.req.header("host") ?? "");

  // Apply extra headers
  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, value);
  }

  // ── Forward request ────────────────────────────────────────────────────────
  const requestMethod = method ?? c.req.method;

  // Don't forward body for GET/HEAD/DELETE
  const body =
    requestMethod !== "GET" && requestMethod !== "HEAD"
      ? c.req.raw.body
      : undefined;

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(target, {
      method: requestMethod,
      headers,
      body,
      // @ts-expect-error — Bun supports duplex for streaming
      duplex: "half",
    });
  } catch (err) {
    throw new ServiceUnavailableError(
      `Upstream service unavailable: ${new URL(target).hostname}`,
      err
    );
  }

  // ── Build response ─────────────────────────────────────────────────────────
  const responseHeaders = new Headers(upstreamResponse.headers);

  // Always forward the request ID back to the client
  responseHeaders.set("x-request-id", requestId);

  // Remove hop-by-hop headers from upstream response
  for (const header of HOP_BY_HOP) {
    responseHeaders.delete(header);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

/**
 * Build target URL by combining service base URL + request path + query string.
 */
export function buildTargetUrl(
  serviceBase: string,
  c: Context,
  stripPrefix?: string
): string {
  const url = new URL(c.req.url);
  let pathname = url.pathname;

  if (stripPrefix && pathname.startsWith(stripPrefix)) {
    pathname = pathname.slice(stripPrefix.length) || "/";
  }

  return `${serviceBase}${pathname}${url.search}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getClientIp(c: Context): string {
  return (
    c.req.header("cf-connecting-ip") ??      // Cloudflare
    c.req.header("x-real-ip") ??             // nginx
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

