// =============================================================================
// Vouchers routes
//
//  POST /vouchers/validate         — validate a voucher (authenticated)
//  GET  /vouchers                  — list all (admin)
//  GET  /vouchers/:id              — get by ID (admin)
//  POST /vouchers                  — create (admin)
//  PATCH /vouchers/:id             — update (admin)
// =============================================================================

import Elysia, { t } from "elysia";

import { databasePlugin } from "@/plugins/database.plugin";
import { jwtMiddleware, requireRole } from "@/middleware/jwt.middleware";
import * as controller from "./vouchers.controller";

const UUID_PARAM = t.Object({ id: t.String({ format: "uuid" }) });

export const vouchersRoutes = new Elysia({ prefix: "/vouchers" })
  .use(databasePlugin)

  // ── Authenticated: validate a voucher before checkout ─────────────────────
  .use(jwtMiddleware)
  .post(
    "/validate",
    ({ db, user, body }) => controller.handleValidate(db, body, user.id),
    {
      body: t.Object({
        code: t.String({ minLength: 3, maxLength: 50 }),
        orderAmount: t.Number({ minimum: 1 }),
      }),
      detail: { tags: ["Vouchers"], summary: "Validate a voucher code" },
    }
  )

  // ── Admin ──────────────────────────────────────────────────────────────────
  .use(requireRole("admin", "super_admin"))
  .get("/", ({ db }) => controller.handleList(db), {
    detail: { tags: ["Vouchers"], summary: "List all vouchers (admin)" },
  })
  .get("/:id", ({ db, params }) => controller.handleGetById(db, params.id), {
    params: UUID_PARAM,
    detail: { tags: ["Vouchers"], summary: "Get voucher by ID (admin)" },
  })
  .post("/", ({ db, body }) => controller.handleCreate(db, body), {
    body: t.Object({
      code: t.String({ minLength: 3, maxLength: 50 }),
      description: t.Optional(t.String({ maxLength: 255 })),
      type: t.Union([
        t.Literal("percentage"),
        t.Literal("fixed_amount"),
        t.Literal("free_shipping"),
      ]),
      value: t.Number({ minimum: 0 }),
      minimumOrderAmount: t.Optional(t.Number({ minimum: 0, default: 0 })),
      maximumDiscountAmount: t.Optional(t.Nullable(t.Number())),
      usageLimit: t.Optional(t.Nullable(t.Number())),
      perUserLimit: t.Optional(t.Number({ default: 1 })),
      isActive: t.Optional(t.Boolean({ default: true })),
      startsAt: t.Optional(t.Nullable(t.String({ format: "date-time" }))),
      expiresAt: t.Optional(t.Nullable(t.String({ format: "date-time" }))),
      restrictedToUserId: t.Optional(t.Nullable(t.String({ format: "uuid" }))),
    }),
    detail: { tags: ["Vouchers"], summary: "Create voucher (admin)" },
  })
  .patch("/:id", ({ db, params, body }) =>
    controller.handleUpdate(db, params.id, body), {
    params: UUID_PARAM,
    body: t.Partial(t.Object({
      description: t.String({ maxLength: 255 }),
      value: t.Number({ minimum: 0 }),
      minimumOrderAmount: t.Number({ minimum: 0 }),
      maximumDiscountAmount: t.Nullable(t.Number()),
      usageLimit: t.Nullable(t.Number()),
      isActive: t.Boolean(),
      startsAt: t.Nullable(t.String({ format: "date-time" })),
      expiresAt: t.Nullable(t.String({ format: "date-time" })),
    })),
    detail: { tags: ["Vouchers"], summary: "Update voucher (admin)" },
  });

