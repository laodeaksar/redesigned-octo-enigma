// =============================================================================
// Shipping proxy routes — forward to order-service
//
// Public (no auth):
//   GET  /shipping/cities   — city search for autocomplete
//   POST /shipping/rates    — calculate shipping cost
// =============================================================================

import { Hono } from "hono";
import { SERVICES } from "@/config";
import { buildTargetUrl, proxyRequest } from "@/lib/proxy";
import { defaultRateLimit } from "@/middleware/rate-limit.middleware";

const app = new Hono();
const orderBase = SERVICES.order;

app.get("/shipping/cities", defaultRateLimit, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: null })
);

app.post("/shipping/rates", defaultRateLimit, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: null })
);

export { app as shippingRoutes };
