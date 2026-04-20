// =============================================================================
// Payments proxy routes — forward to payment-service
//
// Authenticated (customer+):
//   POST /payments              — create Midtrans transaction for an order
//   GET  /payments/:id          — get payment detail
//
// Public (Midtrans webhook — no auth, verified by signature inside service):
//   POST /payments/webhook
//
// Admin:
//   GET  /payments              — list all payments
//   POST /payments/:id/refund   — initiate refund
// =============================================================================

import { Hono } from "hono";

import {
  requireAuth,
  requireRole,
} from "@/middleware/auth.middleware";
import { defaultRateLimit } from "@/middleware/rate-limit.middleware";
import { proxyRequest, buildTargetUrl } from "@/lib/proxy";
import { SERVICES } from "@/config";

const app = new Hono();
const paymentBase = SERVICES.payment;

// ── Midtrans webhook — PUBLIC, no auth (Midtrans sends unsigned requests) ─────
// Signature verification happens inside payment-service.
app.post("/payments/webhook", async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(paymentBase, c),
    user: null,
    extraHeaders: { "x-webhook-source": "midtrans" },
  });
});

// ── Customer: create payment ──────────────────────────────────────────────────
app.post("/payments", requireAuth, defaultRateLimit, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(paymentBase, c),
    user: c.var.user,
  });
});

// ── Customer: get payment detail ──────────────────────────────────────────────
app.get("/payments/:id", requireAuth, defaultRateLimit, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(paymentBase, c),
    user: c.var.user,
  });
});

// ── Admin: list all payments ──────────────────────────────────────────────────
app.get(
  "/payments",
  requireAuth,
  requireRole("admin", "super_admin"),
  defaultRateLimit,
  async (c) =>
    proxyRequest(c, { target: buildTargetUrl(paymentBase, c), user: c.var.user })
);

// ── Admin: refund ─────────────────────────────────────────────────────────────
app.post(
  "/payments/:id/refund",
  requireAuth,
  requireRole("admin", "super_admin"),
  defaultRateLimit,
  async (c) =>
    proxyRequest(c, { target: buildTargetUrl(paymentBase, c), user: c.var.user })
);

export { app as paymentsRoutes };

