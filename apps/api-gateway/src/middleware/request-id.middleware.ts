// =============================================================================
// Request ID middleware
// Generates a unique x-request-id for every request (or reuses incoming one).
// Used for distributed tracing across services.
// =============================================================================

import { createMiddleware } from "hono/factory";

export const requestIdMiddleware = createMiddleware(async (c, next) => {
  const incoming = c.req.header("x-request-id");
  const requestId = incoming ?? crypto.randomUUID();

  c.set("requestId" as never, requestId);
  c.req.raw.headers.set("x-request-id", requestId);

  await next();

  c.header("x-request-id", requestId);
});

