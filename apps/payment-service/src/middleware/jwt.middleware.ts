// =============================================================================
// JWT middleware — reads x-user-* headers forwarded by api-gateway
// =============================================================================

import { InsufficientRoleError, UnauthorizedError } from "@repo/common/errors";
import type { UserRole } from "@repo/common/types";
import Elysia from "elysia";

export const jwtMiddleware = new Elysia({ name: "jwt-middleware" }).derive(
  { as: "scoped" },
  ({ headers }) => {
    const id = headers["x-user-id"];
    const email = headers["x-user-email"];
    const role = headers["x-user-role"] as UserRole | undefined;

    if (!(id && email && role)) {
      throw new UnauthorizedError();
    }

    return { user: { id, email, role } };
  }
);

export const requireRole = (...roles: UserRole[]) =>
  new Elysia({ name: `require-role-${roles.join("-")}` })
    .use(jwtMiddleware)
    .derive({ as: "scoped" }, ({ user }) => {
      if (!roles.includes(user.role)) {
        throw new InsufficientRoleError(roles[0]);
      }
      return {};
    });
