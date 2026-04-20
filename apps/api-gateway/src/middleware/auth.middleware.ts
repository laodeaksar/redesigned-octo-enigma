// =============================================================================
// Auth middleware
//
// requireAuth   — verifies JWT, stores user in context, aborts if invalid
// optionalAuth  — verifies JWT if present, stores user if valid (no abort)
//
// After auth middleware runs, downstream proxy calls inject x-user-* headers.
// =============================================================================

import { createMiddleware } from "hono/factory";

import { failure } from "@repo/common/schemas";
import {
  UnauthorizedError,
  TokenExpiredError,
  TokenInvalidError,
} from "@repo/common/errors";
import type { UserRole } from "@repo/common/types";

import { verifyAccessToken, extractBearerToken } from "@/lib/jwt";
import type { VerifiedUser } from "@/lib/jwt";

// Extend Hono context variables type
declare module "hono" {
  interface ContextVariableMap {
    user: VerifiedUser | null;
  }
}

/**
 * Requires a valid Bearer JWT.
 * Sets `c.var.user` on success; returns 401 on failure.
 */
export const requireAuth = createMiddleware(async (c, next) => {
  const token = extractBearerToken(c.req.header("authorization"));

  if (!token) {
    return c.json(
      failure("UNAUTHORIZED", "Authentication required"),
      401
    );
  }

  try {
    const user = await verifyAccessToken(token);
    c.set("user", user);
    await next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return c.json(failure("TOKEN_EXPIRED", err.message), 401);
    }
    return c.json(failure("TOKEN_INVALID", "Invalid token"), 401);
  }
});

/**
 * Optionally reads a Bearer JWT.
 * Sets `c.var.user` if valid, leaves it null if missing/invalid.
 * Never returns 401 — downstream decides if auth is needed.
 */
export const optionalAuth = createMiddleware(async (c, next) => {
  c.set("user", null);

  const token = extractBearerToken(c.req.header("authorization"));
  if (token) {
    try {
      const user = await verifyAccessToken(token);
      c.set("user", user);
    } catch {
      // Silently ignore invalid tokens in optional auth
    }
  }

  await next();
});

/**
 * Role guard — must be used AFTER requireAuth.
 * Returns 403 if the authenticated user doesn't have the required role.
 */
export const requireRole = (...roles: UserRole[]) =>
  createMiddleware(async (c, next) => {
    const user = c.var.user;

    if (!user) {
      return c.json(failure("UNAUTHORIZED", "Authentication required"), 401);
    }

    if (!roles.includes(user.role)) {
      return c.json(
        failure(
          "INSUFFICIENT_ROLE",
          `This action requires one of the following roles: ${roles.join(", ")}`
        ),
        403
      );
    }

    await next();
  });

