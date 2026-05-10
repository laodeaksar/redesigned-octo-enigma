// =============================================================================
// Cart proxy routes — forward to product-service
//
// All endpoints require authentication (customer+):
//   GET    /cart                       — get cart with live prices
//   GET    /cart/count                 — item count badge
//   POST   /cart/items                 — add item
//   PUT    /cart/items/:variantId      — update quantity
//   DELETE /cart/items/:variantId      — remove item
//   DELETE /cart                       — clear cart
//   POST   /cart/merge                 — merge guest cart on login
// =============================================================================

import { SERVICES } from "@/config";
import { requireAuth } from "@/middleware/auth.middleware";
import { defaultRateLimit } from "@/middleware/rate-limit.middleware";
import { Hono } from "hono";

import { buildTargetUrl, proxyRequest } from "@/lib/proxy";

const app  = new Hono();
const base = SERVICES.product;

const authMw = [requireAuth, defaultRateLimit] as const;

app.get("/cart/count",             ...authMw, async c =>
  proxyRequest(c, { target: buildTargetUrl(base, c), user: c.var.user })
);

app.get("/cart",                   ...authMw, async c =>
  proxyRequest(c, { target: buildTargetUrl(base, c), user: c.var.user })
);

app.post("/cart/merge",            ...authMw, async c =>
  proxyRequest(c, { target: buildTargetUrl(base, c), user: c.var.user })
);

app.post("/cart/items",            ...authMw, async c =>
  proxyRequest(c, { target: buildTargetUrl(base, c), user: c.var.user })
);

app.put("/cart/items/:variantId",  ...authMw, async c =>
  proxyRequest(c, { target: buildTargetUrl(base, c), user: c.var.user })
);

app.delete("/cart/items/:variantId", ...authMw, async c =>
  proxyRequest(c, { target: buildTargetUrl(base, c), user: c.var.user })
);

app.delete("/cart",                ...authMw, async c =>
  proxyRequest(c, { target: buildTargetUrl(base, c), user: c.var.user })
);

export { app as cartRoutes };
