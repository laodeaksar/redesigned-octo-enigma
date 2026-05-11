// =============================================================================
// Auth middleware — verifies JWT, stores user + raw token in context
// =============================================================================

import { createMiddleware } from "hono/factory";

import { TokenExpiredError } from "@repo/common/errors";
import { failure } from "@repo/common/schemas";

import { extractBearerToken, verifyAccessToken } from "@/lib/jwt";
import type { VerifiedUser } from "@/lib/jwt";

declare module "hono" {
  interface ContextVariableMap {
    user: VerifiedUser | null;
    rawToken: string | null;
  }
}

/**
 * Requires a valid Bearer JWT.
 * Sets `c.var.user` and `c.var.rawToken` on success; returns 401 on failure.
 */
export const requireAuth = createMiddleware(async (c, next) => {
  const rawToken = extractBearerToken(c.req.header("authorization"));

  if (!rawToken) {
    return c.json(failure("UNAUTHORIZED", "Authentication required"), 401);
  }

  try {
    const user = await verifyAccessToken(rawToken);
    c.set("user", user);
    c.set("rawToken", rawToken);
    await next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return c.json(failure("TOKEN_EXPIRED", err.message), 401);
    }
    return c.json(failure("TOKEN_INVALID", "Invalid token"), 401);
  }
});

/**
 * Optionally reads a Bearer JWT. Does not abort if missing.
 * Sets `c.var.user = null` and `c.var.rawToken = null` if absent or invalid.
 */
export const optionalAuth = createMiddleware(async (c, next) => {
  const rawToken = extractBearerToken(c.req.header("authorization"));

  if (!rawToken) {
    c.set("user", null);
    c.set("rawToken", null);
    return next();
  }

  try {
    const user = await verifyAccessToken(rawToken);
    c.set("user", user);
    c.set("rawToken", rawToken);
  } catch {
    c.set("user", null);
    c.set("rawToken", null);
  }

  return next();
});
