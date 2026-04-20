// =============================================================================
// JWT middleware — verifies Bearer token, injects user into context
// Usage: apply `.use(jwtMiddleware)` before protected route groups
// =============================================================================

import Elysia from "elysia";

import {
  UnauthorizedError,
  ForbiddenError,
  InsufficientRoleError,
} from "@repo/common/errors";
import type { UserRole } from "@repo/common/types";

import { verifyAccessToken } from "@/lib/jwt";

/**
 * Extracts and verifies the JWT from the Authorization header.
 * On success, injects `user: { id, email, role }` into the Elysia store.
 *
 * Throws UnauthorizedError if the token is missing or invalid.
 */
export const jwtMiddleware = new Elysia({ name: "jwt-middleware" })
  .derive({ as: "scoped" }, async ({ headers }) => {
    const authHeader = headers["authorization"];

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError();
    }

    const token = authHeader.slice(7);
    const payload = await verifyAccessToken(token);

    return {
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      },
    };
  });

/**
 * Guard factory — restrict route to specific roles.
 *
 * Usage:
 *   .use(jwtMiddleware)
 *   .use(requireRole("admin"))
 *   .get("/admin/users", handler)
 */
export const requireRole = (...roles: UserRole[]) =>
  new Elysia({ name: `require-role-${roles.join("-")}` })
    .use(jwtMiddleware)
    .derive({ as: "scoped" }, ({ user }) => {
      if (!roles.includes(user.role)) {
        throw new InsufficientRoleError(roles[0]);
      }
      return {};
    });

