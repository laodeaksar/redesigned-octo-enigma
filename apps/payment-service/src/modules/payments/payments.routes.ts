// =============================================================================
// Payments routes
//
// Public (no auth — Midtrans webhook):
//   POST /payments/webhook
//
// Authenticated (customer+):
//   POST /payments                  — create Snap transaction for an order
//   GET  /payments/:id              — get payment by ID
//   GET  /payments/order/:orderId   — get payment by order ID
//
// Admin:
//   GET  /payments                  — list all payments
//   POST /payments/refund           — initiate refund
// =============================================================================

import Elysia, { t } from "elysia";

import { databasePlugin } from "@/plugins/database.plugin";
import { jwtMiddleware, requireRole } from "@/middleware/jwt.middleware";
import * as controller from "./payments.controller";

const UUID = t.String({ format: "uuid" });

export const paymentsRoutes = new Elysia({ prefix: "/payments" })
  .use(databasePlugin)

  // ── Midtrans webhook — no auth ────────────────────────────────────────────
  // Signature is verified inside the handler using MIDTRANS_SERVER_KEY.
  // Must return HTTP 200 quickly to prevent Midtrans retries.
  .post(
    "/webhook",
    ({ db, body }) => controller.handleWebhook(db, body),
    {
      detail: {
        tags: ["Webhook"],
        summary: "Midtrans HTTP notification — POST by Midtrans after payment",
      },
    }
  )

  // ── Authenticated routes ──────────────────────────────────────────────────
  .use(jwtMiddleware)

  .post(
    "/",
    ({ db, user, body }) =>
      controller.handleCreate(db, user.id, user.email, body),
    {
      body: t.Object({
        orderId: t.String({ minLength: 1 }),
      }),
      detail: {
        tags: ["Payments"],
        summary: "Create a Midtrans Snap transaction for an order",
      },
    }
  )

  .get(
    "/order/:orderId",
    ({ db, user, params }) =>
      controller.handleGetByOrderId(db, params.orderId, user.id, user.role),
    {
      params: t.Object({ orderId: t.String({ minLength: 1 }) }),
      detail: {
        tags: ["Payments"],
        summary: "Get payment by order ID",
      },
    }
  )

  .get(
    "/:id",
    ({ db, user, params }) =>
      controller.handleGetById(db, params.id, user.id, user.role),
    {
      params: t.Object({ id: UUID }),
      detail: {
        tags: ["Payments"],
        summary: "Get payment by ID",
      },
    }
  )

  // ── Admin routes ──────────────────────────────────────────────────────────
  .use(requireRole("admin", "super_admin"))

  .get(
    "/",
    ({ db, query }) => controller.handleList(db, query),
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        status: t.Optional(t.String()),
        method: t.Optional(t.String()),
        userId: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Payments"],
        summary: "List all payments (admin)",
      },
    }
  )

  .post(
    "/refund",
    ({ db, body }) => controller.handleRefund(db, body),
    {
      body: t.Object({
        paymentId: UUID,
        amount: t.Optional(t.Number({ minimum: 1 })),
        reason: t.Union([
          t.Literal("customer_request"),
          t.Literal("defective_product"),
          t.Literal("wrong_item"),
          t.Literal("item_not_received"),
          t.Literal("order_cancelled"),
          t.Literal("admin_action"),
        ]),
        note: t.Optional(t.String({ maxLength: 500 })),
      }),
      detail: {
        tags: ["Refunds"],
        summary: "Initiate a refund (admin)",
      },
    }
  );

