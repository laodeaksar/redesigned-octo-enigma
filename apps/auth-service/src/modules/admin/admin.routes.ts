// =============================================================================
// Admin routes — user management via better-auth admin plugin
//
// All routes require admin or super_admin role (enforced by JWT middleware).
// The better-auth admin plugin also exposes its own endpoints under:
//   /api/auth/admin/*  (ban-user, unban-user, list-users, revoke-sessions, etc.)
//
//  GET    /admin/users             — list users (paginated, filterable)
//  PATCH  /admin/users/:id/role    — set user role
//  POST   /admin/users/:id/ban     — ban a user
//  POST   /admin/users/:id/unban   — unban a user
//  POST   /admin/users/:id/revoke-sessions — revoke all sessions
//  DELETE /admin/users/:id         — delete a user permanently
// =============================================================================

import { ForbiddenError, InsufficientRoleError } from "@repo/common/errors";
import { success } from "@repo/common/schemas";
import type { UserRole } from "@repo/common/types";
import { usersTable } from "@repo/database/drizzle/schema";
import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { auth } from "@/lib/better-auth";
import { jwtMiddleware } from "@/middleware/jwt.middleware";
import { databasePlugin } from "@/plugins/database.plugin";

const ADMIN_ROLES: UserRole[] = ["admin", "super_admin"];

// Helper: build a synthetic headers object for better-auth admin API calls
function makeAdminHeaders(adminUserId: string): Headers {
  return new Headers({
    "Content-Type": "application/json",
    "x-admin-user-id": adminUserId,
  });
}

export const adminRoutes = new Elysia({ prefix: "/admin" })
  .use(databasePlugin)
  .use(jwtMiddleware)
  // Guard: only admin / super_admin can reach any route below
  .derive({ as: "scoped" }, ({ user }) => {
    if (!(user && ADMIN_ROLES.includes(user.role))) {
      throw new InsufficientRoleError("admin");
    }
    return { adminUser: user };
  })

  // ── List users ─────────────────────────────────────────────────────────────
  .get(
    "/users",
    async ({ adminUser, query }) => {
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;

      const result = await auth.api.listUsers({
        query: {
          limit: String(limit),
          offset: String((page - 1) * limit),
          searchField: query.search ? "email" : undefined,
          searchValue: query.search ?? undefined,
          filterField: query.role ? "role" : undefined,
          filterValue: query.role ?? undefined,
          sortBy: (query.sortBy ?? "createdAt") as
            | "createdAt"
            | "email"
            | "name",
          sortDirection: query.sortOrder ?? "desc",
        },
        headers: makeAdminHeaders(adminUser.id),
      });

      return success({
        users: result.users,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      });
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric({ default: 1, minimum: 1 })),
        limit: t.Optional(t.Numeric({ default: 20, minimum: 1, maximum: 100 })),
        search: t.Optional(t.String()),
        role: t.Optional(
          t.Union([
            t.Literal("customer"),
            t.Literal("admin"),
            t.Literal("super_admin"),
          ])
        ),
        sortBy: t.Optional(
          t.Union([
            t.Literal("createdAt"),
            t.Literal("email"),
            t.Literal("name"),
          ])
        ),
        sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
      }),
      detail: {
        tags: ["Admin"],
        summary: "List users (paginated, filterable)",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  // ── Set role ───────────────────────────────────────────────────────────────
  .patch(
    "/users/:id/role",
    async ({ db, adminUser, params, body }) => {
      // Only super_admin can assign the super_admin role
      if (body.role === "super_admin" && adminUser.role !== "super_admin") {
        throw new ForbiddenError(
          "Only super_admin can assign super_admin role"
        );
      }

      // Use the DB directly — better-auth's setRole is typed for "admin"|"user"
      // but our schema uses a pg enum with "customer"|"admin"|"super_admin"
      const [updated] = await db
        .update(usersTable)
        .set({ role: body.role })
        .where(eq(usersTable.id, params.id))
        .returning({ id: usersTable.id, role: usersTable.role });

      if (!updated) {
        throw new ForbiddenError("User not found or cannot be updated");
      }

      // Also revoke existing sessions so the new role takes effect immediately
      await auth.api.revokeUserSessions({
        body: { userId: params.id },
        headers: makeAdminHeaders(adminUser.id),
      });

      return success(
        { userId: params.id, role: body.role },
        "Role updated successfully"
      );
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({
        role: t.Union([
          t.Literal("customer"),
          t.Literal("admin"),
          t.Literal("super_admin"),
        ]),
      }),
      detail: {
        tags: ["Admin"],
        summary: "Set user role (revokes existing sessions)",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  // ── Ban user ───────────────────────────────────────────────────────────────
  .post(
    "/users/:id/ban",
    async ({ adminUser, params, body }) => {
      await auth.api.banUser({
        body: {
          userId: params.id,
          banReason: body.reason,
          banExpiresIn: body.expiresIn,
        },
        headers: makeAdminHeaders(adminUser.id),
      });

      return success({ userId: params.id }, "User banned successfully");
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({
        reason: t.Optional(t.String({ maxLength: 500 })),
        expiresIn: t.Optional(
          t.Number({
            description: "Ban duration in seconds — omit for permanent ban",
          })
        ),
      }),
      detail: {
        tags: ["Admin"],
        summary: "Ban a user",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  // ── Unban user ─────────────────────────────────────────────────────────────
  .post(
    "/users/:id/unban",
    async ({ adminUser, params }) => {
      await auth.api.unbanUser({
        body: { userId: params.id },
        headers: makeAdminHeaders(adminUser.id),
      });

      return success({ userId: params.id }, "User unbanned successfully");
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      detail: {
        tags: ["Admin"],
        summary: "Unban a user",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  // ── Revoke all user sessions ───────────────────────────────────────────────
  .post(
    "/users/:id/revoke-sessions",
    async ({ adminUser, params }) => {
      await auth.api.revokeUserSessions({
        body: { userId: params.id },
        headers: makeAdminHeaders(adminUser.id),
      });

      return success({ userId: params.id }, "All sessions revoked");
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      detail: {
        tags: ["Admin"],
        summary: "Revoke all sessions for a user",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  // ── Delete user ────────────────────────────────────────────────────────────
  .delete(
    "/users/:id",
    async ({ adminUser, params }) => {
      if (params.id === adminUser.id) {
        throw new ForbiddenError("Cannot delete your own account");
      }

      await auth.api.removeUser({
        body: { userId: params.id },
        headers: makeAdminHeaders(adminUser.id),
      });

      return success({ userId: params.id }, "User deleted successfully");
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      detail: {
        tags: ["Admin"],
        summary: "Delete a user permanently",
        security: [{ bearerAuth: [] }],
      },
    }
  );
