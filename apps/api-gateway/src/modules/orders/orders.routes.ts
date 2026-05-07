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
//   GET    /orders
//   PATCH  /orders/:id/status
//   GET    /vouchers
//   POST   /vouchers
//   PATCH  /vouchers/:id
//   DELETE /vouchers/:id
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
import { cartUndoManager } from "@/lib/cart-undo-manager";
import { logger } from "@/lib/logger";

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

// ── Customer: SSE order status stream (bypasses circuit-breaker timeout) ─────
app.get("/orders/:id/stream", requireAuth, async (c) => {
  const user = c.var.user!;
  const id = c.req.param("id");

  const headers = new Headers();
  headers.set("x-user-id", user.id);
  headers.set("x-user-email", user.email);
  headers.set("x-user-role", user.role);
  headers.set("x-request-id", c.req.header("x-request-id") ?? crypto.randomUUID());
  headers.set("Accept", "text/event-stream");
  headers.set("Cache-Control", "no-cache");

  try {
    const upstream = await fetch(`${orderBase}/orders/${id}/stream`, {
      headers,
      signal: c.req.raw.signal,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return c.json(
      { success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Order service unavailable" } },
      503
    );
  }
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

app.delete("/vouchers/:id", ...adminMw, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user })
);

// ── Cart Item Undo Delete Feature ─────────────────────────────────────────────

/**
 * Hapus item keranjang dengan jendela undo 8 detik
 */
app.delete("/cart/items/:itemId", requireAuth, defaultRateLimit, async (c) => {
  const userId = c.var.user.id;
  const cartItemId = c.req.param("itemId");

  // Ambil detail item sebelum dihapus
  const productData = {
    productId: "mock-product-id",
    quantity: 1,
    unitPrice: 0
  };

  const pendingItem = cartUndoManager.scheduleItemDeletion(userId, cartItemId, productData);

  logger.info("Cart item delete scheduled with undo", {
    userId,
    cartItemId,
    deletionId: pendingItem.id
  });

  return c.json({
    success: true,
    data: {
      deletionId: pendingItem.id,
      undoAvailable: true,
      undoWindowMs: 8000,
      message: "Item telah dihapus. Klik batalkan untuk mengembalikan."
    }
  });
});

/**
 * Batalkan penghapusan item keranjang
 */
app.post("/cart/undo-delete/:deletionId", requireAuth, defaultRateLimit, async (c) => {
  const userId = c.var.user.id;
  const deletionId = c.req.param("deletionId");

  const result = await cartUndoManager.undoItemDeletion(deletionId, userId);

  return c.json({
    success: result.success,
    message: result.message,
    data: result.item ? {
      item: result.item,
      remainingTime: result.remainingTime
    } : undefined
  }, result.success ? 200 : 409);
});

export { app as ordersRoutes };

