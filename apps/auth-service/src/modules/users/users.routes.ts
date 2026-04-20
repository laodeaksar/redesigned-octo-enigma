// =============================================================================
// Users routes — all routes require authentication
//
//  GET    /users/me
//  PATCH  /users/me
//  GET    /users/me/addresses
//  POST   /users/me/addresses
//  PATCH  /users/me/addresses/:id
//  DELETE /users/me/addresses/:id
// =============================================================================

import Elysia, { t } from "elysia";

import { databasePlugin } from "@/plugins/database.plugin";
import { jwtMiddleware } from "@/middleware/jwt.middleware";
import * as controller from "./users.controller";

export const usersRoutes = new Elysia({ prefix: "/users" })
  .use(databasePlugin)
  .use(jwtMiddleware)

  // ── Profile ──────────────────────────────────────────────────────────────
  .get(
    "/me",
    ({ db, user }) => controller.handleGetProfile(db, user.id),
    {
      detail: {
        tags: ["Users"],
        summary: "Get my profile",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  .patch(
    "/me",
    ({ db, user, body }) => controller.handleUpdateProfile(db, user.id, body),
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
        avatarUrl: t.Optional(t.Nullable(t.String({ format: "uri" }))),
      }),
      detail: {
        tags: ["Users"],
        summary: "Update my profile",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  // ── Addresses ─────────────────────────────────────────────────────────────
  .get(
    "/me/addresses",
    ({ db, user }) => controller.handleListAddresses(db, user.id),
    {
      detail: {
        tags: ["Users"],
        summary: "List my saved addresses",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  .post(
    "/me/addresses",
    ({ db, user, body }) => controller.handleCreateAddress(db, user.id, body),
    {
      body: t.Object({
        label: t.String({ minLength: 1, maxLength: 50 }),
        recipientName: t.String({ minLength: 1, maxLength: 100 }),
        phone: t.String({ minLength: 9, maxLength: 20 }),
        street: t.String({ minLength: 1 }),
        city: t.String({ minLength: 1, maxLength: 100 }),
        province: t.String({ minLength: 1, maxLength: 100 }),
        postalCode: t.String({ pattern: "^\\d{5}$" }),
        country: t.Optional(t.String({ default: "ID" })),
        isDefault: t.Optional(t.Boolean({ default: false })),
      }),
      detail: {
        tags: ["Users"],
        summary: "Add a new address",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  .patch(
    "/me/addresses/:id",
    ({ db, user, params, body }) =>
      controller.handleUpdateAddress(db, user.id, params.id, body),
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({
        label: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
        recipientName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        phone: t.Optional(t.String({ minLength: 9, maxLength: 20 })),
        street: t.Optional(t.String({ minLength: 1 })),
        city: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        province: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        postalCode: t.Optional(t.String({ pattern: "^\\d{5}$" })),
        isDefault: t.Optional(t.Boolean()),
      }),
      detail: {
        tags: ["Users"],
        summary: "Update an address",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  .delete(
    "/me/addresses/:id",
    ({ db, user, params }) =>
      controller.handleDeleteAddress(db, user.id, params.id),
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      detail: {
        tags: ["Users"],
        summary: "Delete an address",
        security: [{ bearerAuth: [] }],
      },
    }
  );

