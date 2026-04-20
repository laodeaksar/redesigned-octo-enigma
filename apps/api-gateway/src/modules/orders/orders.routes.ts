// =============================================================================
// Orders proxy routes — forward to order-service
//
// Internal (BLOCKED from clients):
//   POST /orders/:id/paid
//   POST /orders/expire
//
// Authenticated (customer+):
//   POST  /orders
//   GET   /orders/me
//   GET   /orders/:id
//   POST  /orders/:id/cancel
//   POST  /vouchers/validate
//
// Admin only:
//   GET   /orders
//   PATCH /orders/:id/status
//   GET   /vouchers
//   POST  /vouchers
//   PATCH /vouchers/:id
// =============================================================================

import { Hono } from "hono";

import {
  requireAuth,
  requireRole,
} from "@/middleware/auth.middleware";
import {
  defaultRateLimit,
  checkoutRateLimit,
} from "@/middleware/rate-limit.middleware";
import { proxyRequest, buildTargetUrl } from "@/lib/proxy";
import { SERVICES } from "@/config";

const app = new Hono();
const orderBase = SERVICES.order;

// ── Block internal endpoints from external clients ────────────────────────────
app.post("/orders/:id/paid", (c) =>
  c.json({ success: false, error: { code: "FORBIDDEN", message: "Access denied" } }, 403)
);

app.post("/orders/expire", (c) =>
  c.json({ success: false, error: { code: "FORBIDDEN", message: "Access denied" } }, 403)
);

// ── Customer: create order ────────────────────────────────────────────────────
app.post("/orders", requireAuth, checkoutRateLimit, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(orderBase, c),
    user: c.var.user,
  });
});

// ── Customer: my orders ───────────────────────────────────────────────────────
app.get("/orders/me", requireAuth, defaultRateLimit, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(orderBase, c),
    user: c.var.user,
  });
});

// ── Customer: get order detail ────────────────────────────────────────────────
app.get("/orders/:id", requireAuth, defaultRateLimit, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(orderBase, c),
    user: c.var.user,
  });
});

// ── Customer: cancel order ────────────────────────────────────────────────────
app.post("/orders/:id/cancel", requireAuth, defaultRateLimit, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(orderBase, c),
    user: c.var.user,
  });
});

// ── Admin: list all orders ────────────────────────────────────────────────────
app.get(
  "/orders",
  requireAuth,
  requireRole("admin", "super_admin"),
  defaultRateLimit,
  async (c) =>
    proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user })
);

// ── Admin: update order status ────────────────────────────────────────────────
app.patch(
  "/orders/:id/status",
  requireAuth,
  requireRole("admin", "super_admin"),
  defaultRateLimit,
  async (c) =>
    proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user })
);

// ── Vouchers: validate (authenticated customer) ───────────────────────────────
app.post("/vouchers/validate", requireAuth, defaultRateLimit, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(orderBase, c),
    user: c.var.user,
  });
});

// ── Vouchers: admin CRUD ──────────────────────────────────────────────────────
const adminMw = [requireAuth, requireRole("admin", "super_admin"), defaultRateLimit] as const;

app.get("/vouchers", ...adminMw, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user })
);

app.get("/vouchers/:id", ...adminMw, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user })
);

app.post("/vouchers", ...adminMw, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user })
);

app.patch("/vouchers/:id", ...adminMw, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user })
);

export { app as ordersRoutes };

