// =============================================================================
// Checkout routes
//
// All endpoints require authentication.
// Requests are forwarded to the API gateway which applies its own auth,
// rate limiting, and audit logging before reaching downstream services.
//
// Endpoints:
//   GET  /checkout/cart                   — cart with live prices
//   GET  /checkout/cart/count             — cart item count (for badge)
//   POST /checkout/cart/merge             — merge guest cart on login
//   GET  /checkout/addresses              — user's saved addresses
//   POST /checkout/shipping/rates         — calculate shipping (RajaOngkir)
//   POST /checkout/vouchers/validate      — validate a voucher code
//   POST /checkout/orders                 — create order
//   POST /checkout/payments               — initiate Midtrans payment
//   GET  /checkout/orders/:id             — order detail (post-payment redirect)
// =============================================================================

import { Hono } from "hono";

import { requireAuth } from "@/middleware/auth.middleware";
import { forwardToGateway } from "@/lib/gateway";

const app = new Hono();

const auth = requireAuth;

// ── Cart ──────────────────────────────────────────────────────────────────────

app.get("/checkout/cart", auth, async c =>
  forwardToGateway(c, { user: c.var.user, rawToken: c.var.rawToken })
);

app.get("/checkout/cart/count", auth, async c =>
  forwardToGateway(c, { user: c.var.user, rawToken: c.var.rawToken })
);

app.post("/checkout/cart/merge", auth, async c =>
  forwardToGateway(c, { user: c.var.user, rawToken: c.var.rawToken })
);

app.post("/checkout/cart/items", auth, async c =>
  forwardToGateway(c, { user: c.var.user, rawToken: c.var.rawToken })
);

app.put("/checkout/cart/items/:variantId", auth, async c =>
  forwardToGateway(c, { user: c.var.user, rawToken: c.var.rawToken })
);

app.delete("/checkout/cart/items/:variantId", auth, async c =>
  forwardToGateway(c, { user: c.var.user, rawToken: c.var.rawToken })
);

app.delete("/checkout/cart", auth, async c =>
  forwardToGateway(c, { user: c.var.user, rawToken: c.var.rawToken })
);

// ── Addresses ─────────────────────────────────────────────────────────────────

app.get("/checkout/addresses", auth, async c =>
  forwardToGateway(c, {
    user: c.var.user,
    rawToken: c.var.rawToken,
    extraHeaders: { "x-forward-path": "/users/me/addresses" },
  })
);

// ── Shipping ──────────────────────────────────────────────────────────────────

app.post("/checkout/shipping/rates", auth, async c =>
  forwardToGateway(c, { user: c.var.user, rawToken: c.var.rawToken })
);

// ── Vouchers ──────────────────────────────────────────────────────────────────

app.post("/checkout/vouchers/validate", auth, async c =>
  forwardToGateway(c, { user: c.var.user, rawToken: c.var.rawToken })
);

// ── Orders ────────────────────────────────────────────────────────────────────

app.post("/checkout/orders", auth, async c =>
  forwardToGateway(c, { user: c.var.user, rawToken: c.var.rawToken })
);

app.get("/checkout/orders/:id", auth, async c =>
  forwardToGateway(c, { user: c.var.user, rawToken: c.var.rawToken })
);

// ── Payments ──────────────────────────────────────────────────────────────────

app.post("/checkout/payments", auth, async c =>
  forwardToGateway(c, { user: c.var.user, rawToken: c.var.rawToken })
);

export { app as checkoutRoutes };
