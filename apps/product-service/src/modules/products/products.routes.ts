// =============================================================================
// Products routes
//
// Public:
//   GET  /products               — list with filter/sort/pagination
//   GET  /products/:id           — detail by ID
//   GET  /products/slug/:slug    — detail by slug
//
// Admin:
//   POST   /products
//   PATCH  /products/:id
//   DELETE /products/:id
//   POST   /products/:id/variants
//   PATCH  /products/:id/variants/:vid
//   DELETE /products/:id/variants/:vid
//   POST   /products/:id/images
//   DELETE /products/:id/images/:iid
//
// Internal (called by order-service):
//   POST  /products/stock/adjust
//   POST  /products/stock/batch-deduct
// =============================================================================

import Elysia, { t } from "elysia";

import { databasePlugin } from "@/plugins/database.plugin";
import { requireRole, jwtMiddleware } from "@/middleware/jwt.middleware";
import * as controller from "./products.controller";

const UUID = t.String({ format: "uuid" });
const UUID_PARAM = t.Object({ id: UUID });

export const productsRoutes = new Elysia({ prefix: "/products" })
  .use(databasePlugin)

  // ── Public routes ───────────────────────────────────────────────────────────
  .get("/", ({ db, redis, query }) => controller.handleList(db, redis, query), {
    detail: { tags: ["Products"], summary: "List products" },
  })
  .get("/slug/:slug", ({ db, redis, params }) =>
    controller.handleGetBySlug(db, redis, params.slug), {
    params: t.Object({ slug: t.String() }),
    detail: { tags: ["Products"], summary: "Get product by slug" },
  })
  .get("/:id", ({ db, redis, params }) =>
    controller.handleGetById(db, redis, params.id), {
    params: UUID_PARAM,
    detail: { tags: ["Products"], summary: "Get product by ID" },
  })

  // ── Internal routes (no role check — api-gateway restricts by caller) ───────
  .post("/stock/adjust",
    ({ db, redis, body }) => controller.handleAdjustStock(db, redis, body), {
    body: t.Object({
      variantId: UUID,
      delta: t.Number(),
      reason: t.String(),
      referenceId: t.Optional(t.Nullable(t.String())),
      note: t.Optional(t.Nullable(t.String())),
    }),
    detail: { tags: ["Stock"], summary: "Adjust stock for a single variant (internal)" },
  })
  .post("/stock/batch-deduct",
    ({ db, redis, body }) => controller.handleBatchDeduct(db, redis, body), {
    body: t.Object({
      orderId: t.String(),
      items: t.Array(t.Object({ variantId: UUID, quantity: t.Number() })),
    }),
    detail: { tags: ["Stock"], summary: "Batch deduct stock (called by order-service)" },
  })

  // ── Admin routes ────────────────────────────────────────────────────────────
  .use(requireRole("admin", "super_admin"))

  .post("/", ({ db, redis, body }) => controller.handleCreate(db, redis, body), {
    detail: { tags: ["Products"], summary: "Create product (admin)" },
  })
  .patch("/:id",
    ({ db, redis, params, body }) =>
      controller.handleUpdate(db, redis, params.id, body), {
    params: UUID_PARAM,
    detail: { tags: ["Products"], summary: "Update product (admin)" },
  })
  .delete("/:id",
    ({ db, redis, params }) => controller.handleDelete(db, redis, params.id), {
    params: UUID_PARAM,
    detail: { tags: ["Products"], summary: "Delete product (admin)" },
  })

  // Variants
  .post("/:id/variants",
    ({ db, redis, params, body }) =>
      controller.handleAddVariant(db, redis, params.id, body), {
    params: UUID_PARAM,
    detail: { tags: ["Variants"], summary: "Add variant (admin)" },
  })
  .patch("/:id/variants/:vid",
    ({ db, redis, params, body }) =>
      controller.handleUpdateVariant(db, redis, params.id, params.vid, body), {
    params: t.Object({ id: UUID, vid: UUID }),
    detail: { tags: ["Variants"], summary: "Update variant (admin)" },
  })
  .delete("/:id/variants/:vid",
    ({ db, redis, params }) =>
      controller.handleDeleteVariant(db, redis, params.id, params.vid), {
    params: t.Object({ id: UUID, vid: UUID }),
    detail: { tags: ["Variants"], summary: "Delete variant (admin)" },
  })

  // Images
  .post("/:id/images",
    ({ db, redis, params, body }) =>
      controller.handleAddImage(db, redis, params.id, body), {
    params: UUID_PARAM,
    body: t.Object({
      url: t.String({ format: "uri" }),
      altText: t.Optional(t.Nullable(t.String())),
      isPrimary: t.Optional(t.Boolean({ default: false })),
    }),
    detail: { tags: ["Images"], summary: "Add image (admin)" },
  })
  .delete("/:id/images/:iid",
    ({ db, redis, params }) =>
      controller.handleRemoveImage(db, redis, params.id, params.iid), {
    params: t.Object({ id: UUID, iid: UUID }),
    detail: { tags: ["Images"], summary: "Delete image (admin)" },
  });

