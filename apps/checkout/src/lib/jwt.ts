// =============================================================================
// JWT verification
// Only the checkout service verifies JWTs — downstream calls use x-user-* headers.
// =============================================================================

import { jwtVerify } from "jose";

import { TokenExpiredError, TokenInvalidError } from "@repo/common/errors";
import type { JwtPayload, UserRole } from "@repo/common/types";

import { env } from "@/config";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);

export interface VerifiedUser {
  email: string;
  id: string;
  role: UserRole;
}

/**
 * Verify a JWT access token and return the user payload.
 * Throws TokenExpiredError or TokenInvalidError on failure.
 */
export async function verifyAccessToken(token: string): Promise<VerifiedUser> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const p = payload as unknown as JwtPayload;
    return { id: p.sub, email: p.email, role: p.role };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("expired")) {
      throw new TokenExpiredError();
    }
    throw new TokenInvalidError();
  }
}

/**
 * Extract token from Authorization header.
 * Returns null if header is missing or malformed.
 */
export function extractBearerToken(
  authHeader: string | undefined
): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}
