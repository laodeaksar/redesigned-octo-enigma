// =============================================================================
// Categories routes
//
//  GET    /categories           — flat list (public)
//  GET    /categories/tree      — nested tree (public)
//  GET    /categories/:id       — single category (public)
//  POST   /categories           — create (admin)
//  PATCH  /categories/:id       — update (admin)
//  DELETE /categories/:id       — soft delete (admin)
// =============================================================================

import Elysia, { t } from "elysia";

import { databasePlugin } from "@/plugins/database.plugin";
import { requireRole } from "@/middleware/jwt.middleware";
import * as controller from "./categories.controller";

const ID_PARAM = t.Object({ id: t.String({ format: "uuid" }) });

export const categoriesRoutes = new Elysia({ prefix: "/categories" })
  .use(databasePlugin)

  // ── Public ─────────────────────────────────────────────────────────────────
  .get("/", ({ db, redis }) => controller.handleList(db, redis), {
    detail: { tags: ["Categories"], summary: "List all categories" },
  })
  .get("/tree", ({ db, redis }) => controller.handleGetTree(db, redis), {
    detail: { tags: ["Categories"], summary: "Get full category tree" },
  })
  .get("/:id", ({ db, redis, params }) => controller.handleGetById(db, redis, params.id), {
    params: ID_PARAM,
    detail: { tags: ["Categories"], summary: "Get category by ID" },
  })

  // ── Admin only ──────────────────────────────────────────────────────────────
  .use(requireRole("admin", "super_admin"))
  .post("/", ({ db, redis, body }) => controller.handleCreate(db, redis, body), {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      slug: t.String({ pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
      description: t.Optional(t.Nullable(t.String())),
      imageUrl: t.Optional(t.Nullable(t.String({ format: "uri" }))),
      parentId: t.Optional(t.Nullable(t.String({ format: "uuid" }))),
      sortOrder: t.Optional(t.Number({ default: 0 })),
    }),
    detail: { tags: ["Categories"], summary: "Create category (admin)" },
  })
  .patch("/:id", ({ db, redis, params, body }) =>
    controller.handleUpdate(db, redis, params.id, body), {
    params: ID_PARAM,
    body: t.Partial(t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      slug: t.String({ pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }),
      description: t.Nullable(t.String()),
      imageUrl: t.Nullable(t.String({ format: "uri" })),
      parentId: t.Nullable(t.String({ format: "uuid" })),
      sortOrder: t.Number(),
    })),
    detail: { tags: ["Categories"], summary: "Update category (admin)" },
  })
  .delete("/:id", ({ db, redis, params }) =>
    controller.handleDelete(db, redis, params.id), {
    params: ID_PARAM,
    detail: { tags: ["Categories"], summary: "Delete category (admin)" },
  });

