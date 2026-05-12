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

import { SERVICES } from "@/config";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import {
  checkoutRateLimit,
  defaultRateLimit,
} from "@/middleware/rate-limit.middleware";
import { Hono } from "hono";

import { buildTargetUrl, proxyRequest } from "@/lib/proxy";

const app = new Hono();
const orderBase = SERVICES.order;

// ── Block internal-only endpoints from external clients ───────────────────────
const internalBlocked = (c: any) =>
  c.json(
    { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
    403
  );

app.post("/orders/:id/paid", internalBlocked);
app.post("/orders/expire", internalBlocked);
app.get("/orders/:id/verify-purchase", internalBlocked);

// ── Customer: create order ────────────────────────────────────────────────────
app.post("/orders", requireAuth, checkoutRateLimit, async c =>
  proxyRequest(c, {
    target: buildTargetUrl(orderBase, c),
    user: c.var.user,
  })
);

// ── Customer: my orders ───────────────────────────────────────────────────────
app.get("/orders/me", requireAuth, defaultRateLimit, async c =>
  proxyRequest(c, {
    target: buildTargetUrl(orderBase, c),
    user: c.var.user,
  })
);

// ── Customer: SSE order status stream (bypasses circuit-breaker timeout) ─────
app.get("/orders/:id/stream", requireAuth, async c => {
  const user = c.var.user!;
  const id = c.req.param("id");

  const headers = new Headers();
  headers.set("x-user-id", user.id);
  headers.set("x-user-email", user.email);
  headers.set("x-user-role", user.role);
  headers.set(
    "x-request-id",
    c.req.header("x-request-id") ?? crypto.randomUUID()
  );
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
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return c.json(
      {
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Order service unavailable",
        },
      },
      503
    );
  }
});

// ── Customer: get order detail ────────────────────────────────────────────────
app.get("/orders/:id", requireAuth, defaultRateLimit, async c =>
  proxyRequest(c, {
    target: buildTargetUrl(orderBase, c),
    user: c.var.user,
  })
);

// ── Customer: cancel order ────────────────────────────────────────────────────
app.post("/orders/:id/cancel", requireAuth, defaultRateLimit, async c =>
  proxyRequest(c, {
    target: buildTargetUrl(orderBase, c),
    user: c.var.user,
  })
);

// ── Customer: request refund (delivered orders only) ─────────────────────────
app.post("/orders/:id/refund", requireAuth, defaultRateLimit, async c =>
  proxyRequest(c, {
    target: buildTargetUrl(orderBase, c),
    user: c.var.user,
  })
);

// ── Admin: list all orders ────────────────────────────────────────────────────
app.get(
  "/orders",
  requireAuth,
  requireRole("admin", "super_admin"),
  defaultRateLimit,
  async c =>
    proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user })
);

// ── Admin: update order status (+ fire push notification) ─────────────────────
app.patch(
  "/orders/:id/status",
  requireAuth,
  requireRole("admin", "super_admin"),
  defaultRateLimit,
  async c => {
    const id = c.req.param("id");
    const response = await proxyRequest(c, {
      target: buildTargetUrl(orderBase, c),
      user: c.var.user,
    });

    if (response.ok) {
      // Clone response to read status without consuming the original stream
      response
        .clone()
        .json()
        .then((body: any) => {
          const newStatus = body?.data?.status as string | undefined;
          const orderNumber = body?.data?.orderNumber as string | undefined;
          if (newStatus) {
            fetch("http://localhost:5000/api/push/notify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-internal-key":
                  process.env.INTERNAL_NOTIFY_KEY ?? "push-notify-internal",
              },
              body: JSON.stringify({
                orderId: id,
                status: newStatus,
                orderNumber,
              }),
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }

    return response;
  }
);

// ── Vouchers: validate (authenticated customer) ───────────────────────────────
app.post("/vouchers/validate", requireAuth, defaultRateLimit, async c =>
  proxyRequest(c, {
    target: buildTargetUrl(orderBase, c),
    user: c.var.user,
  })
);

// ── Vouchers: admin CRUD ──────────────────────────────────────────────────────
const adminMw = [
  requireAuth,
  requireRole("admin", "super_admin"),
  defaultRateLimit,
] as const;

app.get("/vouchers", ...adminMw, async c =>
  proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user })
);

app.get("/vouchers/:id", ...adminMw, async c =>
  proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user })
);

app.post("/vouchers", ...adminMw, async c =>
  proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user })
);

app.patch("/vouchers/:id", ...adminMw, async c =>
  proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user })
);

app.delete("/vouchers/:id", ...adminMw, async c =>
  proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user })
);

export { app as ordersRoutes };
