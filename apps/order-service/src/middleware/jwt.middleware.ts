// =============================================================================
// JWT middleware — reads x-user-* headers forwarded by api-gateway
// Internal middleware — verifies x-internal-key for service-to-service calls
// =============================================================================

import { env } from "@/config";
import Elysia from "elysia";

import {
  ForbiddenError,
  InsufficientRoleError,
  UnauthorizedError,
} from "@repo/common/errors";
import type { UserRole } from "@repo/common/types";

/**
 * Reads x-user-id / x-user-email / x-user-role headers set by api-gateway
 * and injects them as `user` into the Elysia context.
 */
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

/**
 * Role guard factory — checks JWT headers AND restricts to specific roles.
 * Intentionally inlined (not nesting jwtMiddleware plugin) so errors propagate
 * correctly through Elysia's onError chain.
 */
export const requireRole = (...roles: UserRole[]) =>
  new Elysia({ name: `require-role-${roles.join("-")}` }).derive(
    { as: "scoped" },
    ({ headers }) => {
      const id = headers["x-user-id"];
      const email = headers["x-user-email"];
      const role = headers["x-user-role"] as UserRole | undefined;

      if (!(id && email && role)) {
        throw new UnauthorizedError();
      }

      if (!roles.includes(role)) {
        throw new InsufficientRoleError(roles[0]);
      }

      return { user: { id, email, role } };
    }
  );

/**
 * Internal service middleware — validates x-internal-key shared secret.
 * Apply to endpoints that should only be reachable by other internal services,
 * never by external clients (even if they somehow bypass the api-gateway block).
 */
export const internalMiddleware = new Elysia({
  name: "internal-middleware",
}).derive({ as: "scoped" }, ({ headers }) => {
  const key = headers["x-internal-key"];
  if (!key || key !== env.INTERNAL_SERVICE_KEY) {
    throw new ForbiddenError("Internal endpoint — access denied");
  }
  return {};
});
