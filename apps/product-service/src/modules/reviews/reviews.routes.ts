// =============================================================================
// Reviews routes
//
// Public:
//   GET  /products/:id/reviews          — paginated reviews for a product
//   GET  /products/:id/reviews/summary  — rating breakdown summary
//
// Authenticated:
//   POST /products/:id/reviews          — submit a review (verified purchase)
// =============================================================================

import Elysia, { t } from "elysia";

import { databasePlugin } from "@/plugins/database.plugin";
import { jwtMiddleware } from "@/middleware/jwt.middleware";
import * as controller from "./reviews.controller";

const UUID_PARAM = t.Object({ id: t.String({ format: "uuid" }) });

export const reviewsRoutes = new Elysia({ prefix: "/products" })
  .use(databasePlugin)

  // ── Public ─────────────────────────────────────────────────────────────────
  .get(
    "/:id/reviews/summary",
    ({ db, redis, params }) =>
      controller.handleGetRatingSummary(db, redis, params.id),
    {
      params: UUID_PARAM,
      detail: { tags: ["Reviews"], summary: "Get rating summary for a product" },
    }
  )
  .get(
    "/:id/reviews",
    ({ db, redis, params, query }) =>
      controller.handleList(db, redis, params.id, query),
    {
      params: UUID_PARAM,
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: { tags: ["Reviews"], summary: "List reviews for a product" },
    }
  )

  // ── Authenticated ──────────────────────────────────────────────────────────
  .use(jwtMiddleware)
  .post(
    "/:id/reviews",
    ({ db, redis, params, user, body }) =>
      controller.handleCreate(db, redis, user.id, {
        ...(body as object),
        productId: params.id,
      }),
    {
      params: UUID_PARAM,
      body: t.Object({
        orderId: t.String({ minLength: 1 }),
        rating: t.Number({ minimum: 1, maximum: 5 }),
        title: t.Optional(t.Nullable(t.String({ maxLength: 150 }))),
        body: t.Optional(t.Nullable(t.String({ maxLength: 2000 }))),
        imageUrls: t.Optional(t.Array(t.String({ format: "uri" }), { maxItems: 5 })),
      }),
      detail: {
        tags: ["Reviews"],
        summary: "Submit a product review (requires purchase)",
      },
    }
  );

