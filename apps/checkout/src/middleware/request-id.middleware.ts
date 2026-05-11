// =============================================================================
// Request ID middleware — stamps every request with a UUID for tracing
// =============================================================================

import { createMiddleware } from "hono/factory";

export const requestIdMiddleware = createMiddleware(async (c, next) => {
  const requestId =
    c.req.header("x-request-id") ?? crypto.randomUUID();
  c.req.raw.headers.set("x-request-id", requestId);
  await next();
  c.res.headers.set("x-request-id", requestId);
});
