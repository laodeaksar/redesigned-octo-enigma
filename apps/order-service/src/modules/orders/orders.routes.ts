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
// Internal (requires x-internal-key — called by payment-service, scheduler):
//   GET    /orders/:id/verify-purchase — verify a user purchased a product
//   POST   /orders/:id/paid           — mark as paid + transition to processing
//   POST   /orders/expire             — expire stale pending orders
// =============================================================================

import Elysia, { t } from "elysia";
import {
  internalMiddleware,
  jwtMiddleware,
  requireRole,
} from "@/middleware/jwt.middleware";
import { databasePlugin } from "@/plugins/database.plugin";
import * as controller from "./orders.controller";
import * as repo from "./orders.repository";

const MONGO_ID = t.String({ minLength: 24, maxLength: 24 });
const ID_PARAM = t.Object({ id: MONGO_ID });

// ── Internal routes (service-to-service only, protected by x-internal-key) ───
export const ordersInternalRoutes = new Elysia({ prefix: "/orders" })
  .use(databasePlugin)
  .use(internalMiddleware)

  .get(
    "/:id/verify-purchase",
    async ({ params, query }) => {
      const { userId, productId } = query as {
        userId?: string;
        productId?: string;
      };
      if (!(userId && productId)) {
        return { success: true, data: { verified: false } };
      }
      const order = await repo.findOrderById(params.id);
      const verified =
        !!order &&
        order.userId === userId &&
        ["delivered", "completed"].includes(order.status) &&
        order.items.some((i) => i.product.productId === productId);
      return { success: true, data: { verified } };
    },
    {
      params: t.Object({ id: t.String({ minLength: 1 }) }),
      detail: {
        tags: ["Orders"],
        summary:
          "Verify user purchased a product (internal — requires x-internal-key)",
      },
    }
  )

  .post(
    "/:id/paid",
    ({ params, body }) => controller.handleMarkPaid(params.id, body),
    {
      params: ID_PARAM,
      body: t.Object({ paymentId: t.String({ minLength: 1 }) }),
      detail: {
        tags: ["Orders"],
        summary: "Mark order as paid (internal — requires x-internal-key)",
      },
    }
  )

  .post("/expire", () => controller.handleExpireOrders(), {
    detail: {
      tags: ["Orders"],
      summary:
        "Expire stale pending-payment orders (internal — requires x-internal-key)",
    },
  });

// ── Customer + admin routes (user JWT required) ───────────────────────────────
export const ordersRoutes = new Elysia({ prefix: "/orders" })
  .use(databasePlugin)
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
        destinationCityId: t.String({
          minLength: 1,
          description: "RajaOngkir city ID",
        }),
        courier: t.String({ minLength: 1 }),
        courierService: t.String({ minLength: 1 }),
        shippingCost: t.Number({
          minimum: 0,
          description: "Verified by server via RajaOngkir",
        }),
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

  // ── SSE: stream order status updates ─────────────────────────────────────
  .get(
    "/:id/stream",
    async ({ params, user }) => {
      const TERMINAL = new Set(["completed", "cancelled", "refunded"]);

      let order: Awaited<ReturnType<typeof repo.findOrderById>>;
      try {
        order = await repo.findOrderById(params.id);
      } catch {
        return new Response('data: {"error":"db_unavailable"}\n\n', {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      }

      if (!order) {
        return new Response(
          `event: error\ndata: ${JSON.stringify({ code: "NOT_FOUND" })}\n\n`,
          { status: 404, headers: { "Content-Type": "text/event-stream" } }
        );
      }

      if (user.role === "customer" && order.userId !== user.id) {
        return new Response(
          `event: error\ndata: ${JSON.stringify({ code: "FORBIDDEN" })}\n\n`,
          { status: 403, headers: { "Content-Type": "text/event-stream" } }
        );
      }

      const encoder = new TextEncoder();
      let timerId: ReturnType<typeof setInterval> | null = null;
      let closed = false;

      const stream = new ReadableStream({
        start(controller) {
          const send = (event: string, data: unknown) => {
            if (closed) {
              return;
            }
            try {
              controller.enqueue(
                encoder.encode(
                  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
                )
              );
            } catch {
              closed = true;
              if (timerId) {
                clearInterval(timerId);
                timerId = null;
              }
            }
          };

          const extractUpdate = (o: NonNullable<typeof order>) => ({
            status: o.status,
            statusHistory: o.statusHistory ?? [],
            shipping: o.shipping ?? null,
            updatedAt: o.updatedAt,
          });

          send("connected", { orderId: params.id });
          send("order-update", extractUpdate(order!));

          if (TERMINAL.has(order!.status)) {
            controller.close();
            return;
          }

          let lastStatus = order!.status;
          let lastUpdatedAt = String(order!.updatedAt);

          timerId = setInterval(async () => {
            if (closed) {
              return;
            }
            try {
              const fresh = await repo.findOrderById(params.id);
              if (!fresh) {
                if (timerId) {
                  clearInterval(timerId);
                  timerId = null;
                }
                if (!closed) {
                  closed = true;
                  try {
                    controller.close();
                  } catch {}
                }
                return;
              }

              const freshStatus = fresh.status;
              const freshUpdated = String(fresh.updatedAt);

              if (
                freshStatus !== lastStatus ||
                freshUpdated !== lastUpdatedAt
              ) {
                lastStatus = freshStatus;
                lastUpdatedAt = freshUpdated;
                send("order-update", extractUpdate(fresh));

                if (TERMINAL.has(freshStatus)) {
                  if (timerId) {
                    clearInterval(timerId);
                    timerId = null;
                  }
                  setTimeout(() => {
                    if (!closed) {
                      closed = true;
                      try {
                        controller.close();
                      } catch {}
                    }
                  }, 500);
                }
              } else {
                send("heartbeat", { ts: Date.now() });
              }
            } catch {
              if (timerId) {
                clearInterval(timerId);
                timerId = null;
              }
              if (!closed) {
                closed = true;
                try {
                  controller.close();
                } catch {}
              }
            }
          }, 3000);
        },
        cancel() {
          closed = true;
          if (timerId) {
            clearInterval(timerId);
            timerId = null;
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    },
    {
      params: ID_PARAM,
      detail: {
        tags: ["Orders"],
        summary: "Stream order status updates via SSE (authenticated)",
      },
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

  .get("/", ({ query }) => controller.handleListOrders(query), {
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
  })

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
