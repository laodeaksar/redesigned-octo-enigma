// =============================================================================
// JWT verification — api-gateway is the only service that verifies JWTs.
// All downstream services trust x-user-* headers injected here.
// =============================================================================

import { jwtVerify } from "jose";

import {
  TokenExpiredError,
  TokenInvalidError,
} from "@repo/common/errors";
import type { JwtPayload, UserRole } from "@repo/common/types";

import { env } from "@/config";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);

export interface VerifiedUser {
  id: string;
  email: string;
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

    return {
      id: p.sub,
      email: p.email,
      role: p.role,
    };
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
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

