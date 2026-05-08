// =============================================================================
// Payments proxy routes — forward to payment-service
//
// Authenticated (customer+):
//   POST /payments                    — create Midtrans transaction for an order
//   GET  /payments/order/:orderId     — get payment by order ID
//   GET  /payments/:id                — get payment detail
//
// Public (Midtrans webhook — no auth, verified by signature inside service):
//   POST /payments/webhook
//
// Admin:
//   GET  /payments              — list all payments
//   POST /payments/:id/refund   — initiate refund
// =============================================================================

import { Hono } from "hono";
import { SERVICES } from "@/config";
import { buildTargetUrl, proxyRequest } from "@/lib/proxy";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import {
  defaultRateLimit,
  webhookRateLimit,
} from "@/middleware/rate-limit.middleware";
import { midtransAllowlistMiddleware } from "@/middleware/webhook-allowlist.middleware";
import { verifyMidtransWebhook } from "@/middleware/webhook-verify.middleware";

const app = new Hono();
const paymentBase = SERVICES.payment;

// ── Midtrans webhook — PUBLIC, layered defenses ───────────────────────────────
// Middleware order is intentional — each layer is cheaper than the next:
//
//   1. midtransAllowlistMiddleware
//      Hard outer wall: rejects any IP not in the Midtrans CIDR ranges before
//      consuming rate-limit budget, doing crypto, or touching the DB.
//      Returns 200 (not 4xx) so Midtrans does not retry on misconfiguration.
//      Disable with MIDTRANS_WEBHOOK_ALLOWLIST_ENABLED=false (dev/test only).
//
//   2. webhookRateLimit
//      Sliding-window cap: max 20 req/min per IP (WEBHOOK_RATE_LIMIT_MAX env).
//      Throttles the small set of IPs that passed the allowlist check.
//
//   3. verifyMidtransWebhook
//      SHA512 signature check + Redis replay dedup + DB audit log.
//
//   4. proxyRequest → payment-service
app.post(
  "/payments/webhook",
  midtransAllowlistMiddleware,
  webhookRateLimit,
  verifyMidtransWebhook,
  async (c) =>
    proxyRequest(c, {
      target: buildTargetUrl(paymentBase, c),
      user: null,
      extraHeaders: { "x-webhook-source": "midtrans" },
    })
);

// ── Customer: create payment ──────────────────────────────────────────────────
app.post("/payments", requireAuth, defaultRateLimit, async (c) =>
  proxyRequest(c, {
    target: buildTargetUrl(paymentBase, c),
    user: c.var.user,
  })
);

// ── Customer: get payment by order ID ────────────────────────────────────────
app.get("/payments/order/:orderId", requireAuth, defaultRateLimit, async (c) =>
  proxyRequest(c, {
    target: buildTargetUrl(paymentBase, c),
    user: c.var.user,
  })
);

// ── Customer: get payment detail ──────────────────────────────────────────────
app.get("/payments/:id", requireAuth, defaultRateLimit, async (c) =>
  proxyRequest(c, {
    target: buildTargetUrl(paymentBase, c),
    user: c.var.user,
  })
);

// ── Admin: list all payments ──────────────────────────────────────────────────
app.get(
  "/payments",
  requireAuth,
  requireRole("admin", "super_admin"),
  defaultRateLimit,
  async (c) =>
    proxyRequest(c, {
      target: buildTargetUrl(paymentBase, c),
      user: c.var.user,
    })
);

// ── Admin: refund ─────────────────────────────────────────────────────────────
app.post(
  "/payments/:id/refund",
  requireAuth,
  requireRole("admin", "super_admin"),
  defaultRateLimit,
  async (c) =>
    proxyRequest(c, {
      target: buildTargetUrl(paymentBase, c),
      user: c.var.user,
    })
);

export { app as paymentsRoutes };
