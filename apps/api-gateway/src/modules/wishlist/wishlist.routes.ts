// =============================================================================
// Wishlist proxy routes — forward to product-service
//
// All endpoints require authentication (customer+):
//   GET    /wishlist/count                 — total count (lightweight badge fetch)
//   GET    /wishlist                       — paginated wishlist
//   GET    /wishlist/status/:productId     — single product status
//   POST   /wishlist/status/bulk           — bulk status check
//   POST   /wishlist/:productId            — add to wishlist
//   DELETE /wishlist/:productId            — remove from wishlist
//   POST   /wishlist/:productId/toggle     — toggle wishlist
// =============================================================================

import { SERVICES } from "@/config";
import { requireAuth } from "@/middleware/auth.middleware";
import { defaultRateLimit } from "@/middleware/rate-limit.middleware";
import { Hono } from "hono";

import { buildTargetUrl, proxyRequest } from "@/lib/proxy";

const app = new Hono();
const productBase = SERVICES.product;

app.get("/wishlist/count", requireAuth, defaultRateLimit, async c =>
  proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

app.get("/wishlist", requireAuth, defaultRateLimit, async c =>
  proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

app.get("/wishlist/status/:productId", requireAuth, defaultRateLimit, async c =>
  proxyRequest(c, {
    target: buildTargetUrl(productBase, c),
    user: c.var.user,
  })
);

app.post("/wishlist/status/bulk", requireAuth, defaultRateLimit, async c =>
  proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

app.post("/wishlist/:productId", requireAuth, defaultRateLimit, async c =>
  proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

app.delete("/wishlist/:productId", requireAuth, defaultRateLimit, async c =>
  proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

app.post(
  "/wishlist/:productId/toggle",
  requireAuth,
  defaultRateLimit,
  async c =>
    proxyRequest(c, {
      target: buildTargetUrl(productBase, c),
      user: c.var.user,
    })
);

export { app as wishlistRoutes };
