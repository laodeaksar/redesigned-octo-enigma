// =============================================================================
// Products proxy routes — forward to product-service
//
// Public (no auth):
//   GET  /categories/**
//   GET  /products/**
//
// Authenticated (customer+):
//   POST /products/:id/reviews
//
// Admin only:
//   POST   /categories
//   PATCH  /categories/:id
//   DELETE /categories/:id
//   POST   /products
//   PATCH  /products/:id
//   DELETE /products/:id
//   POST   /products/:id/variants
//   PATCH  /products/:id/variants/:vid
//   DELETE /products/:id/variants/:vid
//   POST   /products/:id/images
//   DELETE /products/:id/images/:iid
//
// Internal only (not exposed to clients):
//   POST /products/stock/adjust
//   POST /products/stock/batch-deduct
// =============================================================================

import { Hono } from "hono";

import {
  requireAuth,
  optionalAuth,
  requireRole,
} from "@/middleware/auth.middleware";
import {
  defaultRateLimit,
} from "@/middleware/rate-limit.middleware";
import { proxyRequest, buildTargetUrl } from "@/lib/proxy";
import { SERVICES } from "@/config";

const app = new Hono();
const productBase = SERVICES.product;

// ── Block internal stock endpoints from clients ───────────────────────────────
app.all("/products/stock/*", (c) =>
  c.json({ success: false, error: { code: "FORBIDDEN", message: "Access denied" } }, 403)
);

// ── Category public reads ─────────────────────────────────────────────────────
app.get("/categories/*", defaultRateLimit, optionalAuth, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(productBase, c),
    user: c.var.user,
  });
});

app.get("/categories", defaultRateLimit, optionalAuth, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(productBase, c),
    user: c.var.user,
  });
});

// ── Category admin writes ─────────────────────────────────────────────────────
app.post(
  "/categories",
  requireAuth,
  requireRole("admin", "super_admin"),
  defaultRateLimit,
  async (c) =>
    proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

app.patch(
  "/categories/:id",
  requireAuth,
  requireRole("admin", "super_admin"),
  defaultRateLimit,
  async (c) =>
    proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

app.delete(
  "/categories/:id",
  requireAuth,
  requireRole("admin", "super_admin"),
  defaultRateLimit,
  async (c) =>
    proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

// ── Product public reads ──────────────────────────────────────────────────────
app.get("/products/search", defaultRateLimit, optionalAuth, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(productBase, c),
    user: c.var.user,
  });
});

app.get("/products", defaultRateLimit, optionalAuth, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(productBase, c),
    user: c.var.user,
  });
});

app.get("/products/slug/:slug", defaultRateLimit, optionalAuth, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(productBase, c),
    user: c.var.user,
  });
});

app.get("/products/:id", defaultRateLimit, optionalAuth, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(productBase, c),
    user: c.var.user,
  });
});

// ── Reviews: public list, authenticated create ────────────────────────────────
app.get("/products/:id/reviews", defaultRateLimit, optionalAuth, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(productBase, c),
    user: c.var.user,
  });
});

app.get("/products/:id/reviews/summary", defaultRateLimit, async (c) => {
  return proxyRequest(c, { target: buildTargetUrl(productBase, c), user: null });
});

app.post("/products/:id/reviews", requireAuth, defaultRateLimit, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(productBase, c),
    user: c.var.user,
  });
});

// ── Product admin writes ──────────────────────────────────────────────────────
const adminMiddleware = [requireAuth, requireRole("admin", "super_admin"), defaultRateLimit] as const;

app.post("/products", ...adminMiddleware, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

app.patch("/products/:id", ...adminMiddleware, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

app.delete("/products/:id", ...adminMiddleware, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

// Variants
app.post("/products/:id/variants", ...adminMiddleware, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

app.patch("/products/:id/variants/:vid", ...adminMiddleware, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

app.delete("/products/:id/variants/:vid", ...adminMiddleware, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

// Images
app.post("/products/:id/images", ...adminMiddleware, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

app.delete("/products/:id/images/:iid", ...adminMiddleware, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(productBase, c), user: c.var.user })
);

export { app as productsRoutes };

