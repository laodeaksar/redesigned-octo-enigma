// =============================================================================
// Orders routes
//
// Customer (authenticated):
//   POST   /orders                    — create order
//   GET    /orders/me                 — my order list
//   GET    /orders/:id                — get order detail
//   POST   /orders/:id/cancel         — cancel order
//
// Admin:
//   GET    /orders                    — list all orders
//   PATCH  /orders/:id/status         — update status (ship, deliver, etc.)
//
// Internal (called by payment-service, scheduler):
//   POST   /orders/:id/paid           — mark as paid + transition to processing
//   POST   /orders/expire             — expire stale pending orders
// =============================================================================

import Elysia, { t } from "elysia";

import { databasePlugin } from "@/plugins/database.plugin";
import { jwtMiddleware, requireRole } from "@/middleware/jwt.middleware";
import * as controller from "./orders.controller";

const MONGO_ID = t.String({ minLength: 24, maxLength: 24 });
const ID_PARAM = t.Object({ id: MONGO_ID });

export const ordersRoutes = new Elysia({ prefix: "/orders" })
  .use(databasePlugin)

  // ── Internal endpoints (no user auth — called service-to-service) ──────────
  .post(
    "/:id/paid",
    ({ params, body }) => controller.handleMarkPaid(params.id, body),
    {
      params: ID_PARAM,
      body: t.Object({ paymentId: t.String({ minLength: 1 }) }),
      detail: {
        tags: ["Orders"],
        summary: "Mark order as paid (called by payment-service)",
      },
    }
  )
  .post(
    "/expire",
    () => controller.handleExpireOrders(),
    {
      detail: {
        tags: ["Orders"],
        summary: "Expire stale pending-payment orders (called by scheduler)",
      },
    }
  )

  // ── Authenticated routes ───────────────────────────────────────────────────
  .use(jwtMiddleware)

  .post(
    "/",
    ({ db, user, body }) =>
      controller.handleCreate(db, user.id, user.email, body),
    {
      body: t.Object({
        items: t.Array(
          t.Object({
            variantId: t.String({ format: "uuid" }),
            quantity: t.Number({ minimum: 1, maximum: 999 }),
          }),
          { minItems: 1, maxItems: 50 }
        ),
        shippingAddressId: t.String({ format: "uuid" }),
        courier: t.String({ minLength: 1 }),
        courierService: t.String({ minLength: 1 }),
        voucherCode: t.Optional(t.String({ maxLength: 50 })),
        customerNote: t.Optional(t.String({ maxLength: 500 })),
      }),
      detail: { tags: ["Orders"], summary: "Create a new order" },
    }
  )

  .get(
    "/me",
    ({ user, query }) => controller.handleGetMyOrders(user.id, query),
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
      detail: { tags: ["Orders"], summary: "Get my orders" },
    }
  )

  .get(
    "/:id",
    ({ params, user }) =>
      controller.handleGetById(params.id, user.id, user.role),
    {
      params: ID_PARAM,
      detail: { tags: ["Orders"], summary: "Get order by ID" },
    }
  )

  .post(
    "/:id/cancel",
    ({ db, params, user, body }) =>
      controller.handleCancel(
        db,
        params.id,
        user.id,
        user.role,
        user.email,
        body
      ),
    {
      params: ID_PARAM,
      body: t.Object({
        reason: t.Union([
          t.Literal("customer_request"),
          t.Literal("payment_expired"),
          t.Literal("out_of_stock"),
          t.Literal("fraud_detected"),
          t.Literal("admin_action"),
        ]),
        note: t.Optional(t.String({ maxLength: 500 })),
      }),
      detail: { tags: ["Orders"], summary: "Cancel an order" },
    }
  )

  // ── Admin routes ────────────────────────────────────────────────────────────
  .use(requireRole("admin", "super_admin"))

  .get(
    "/",
    ({ query }) => controller.handleListOrders(query),
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        status: t.Optional(t.String()),
        userId: t.Optional(t.String()),
        search: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.String()),
      }),
      detail: { tags: ["Orders"], summary: "List all orders (admin)" },
    }
  )

  .patch(
    "/:id/status",
    ({ params, user, body }) =>
      controller.handleUpdateStatus(params.id, user.id, user.email, body),
    {
      params: ID_PARAM,
      body: t.Object({
        status: t.Union([
          t.Literal("processing"),
          t.Literal("shipped"),
          t.Literal("delivered"),
          t.Literal("completed"),
          t.Literal("cancelled"),
          t.Literal("refund_requested"),
          t.Literal("refunded"),
        ]),
        note: t.Optional(t.String({ maxLength: 500 })),
        trackingNumber: t.Optional(t.String({ maxLength: 100 })),
        courier: t.Optional(t.String()),
      }),
      detail: { tags: ["Orders"], summary: "Update order status (admin)" },
    }
  );

