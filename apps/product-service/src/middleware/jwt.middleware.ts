// =============================================================================
// JWT middleware — reads x-user-* headers forwarded by api-gateway
// Internal services never re-verify the JWT — they trust the gateway headers.
// =============================================================================

import Elysia from "elysia";

import {
  UnauthorizedError,
  InsufficientRoleError,
} from "@repo/common/errors";
import type { UserRole } from "@repo/common/types";

/**
 * Reads x-user-id / x-user-email / x-user-role headers set by api-gateway
 * and injects them as `user` into the Elysia context.
 */
export const jwtMiddleware = new Elysia({ name: "jwt-middleware" })
  .derive({ as: "scoped" }, ({ headers }) => {
    const id = headers["x-user-id"];
    const email = headers["x-user-email"];
    const role = headers["x-user-role"] as UserRole | undefined;

    if (!id || !email || !role) {
      throw new UnauthorizedError();
    }

    return { user: { id, email, role } };
  });

/**
 * Role guard factory — restrict to one or more roles.
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

