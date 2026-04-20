// =============================================================================
// JWT helpers — sign & verify using jose (Web Crypto, works in Bun)
// =============================================================================

import {
  SignJWT,
  jwtVerify,
  type JWTPayload as JosePayload,
} from "jose";

import {
  TokenExpiredError,
  TokenInvalidError,
} from "@repo/common/errors";
import type { JwtPayload, RefreshTokenPayload, UserRole } from "@repo/common/types";

import { env } from "@/config";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);

// ── Access Token ──────────────────────────────────────────────────────────────

export async function signAccessToken(payload: {
  sub: string;
  email: string;
  role: UserRole;
}): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(SECRET);
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JwtPayload;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("expired")) {
      throw new TokenExpiredError();
    }
    throw new TokenInvalidError();
  }
}

// ── Refresh Token ─────────────────────────────────────────────────────────────

export async function signRefreshToken(payload: {
  sub: string;
  jti: string;
}): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setJti(payload.jti)
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
    .sign(SECRET);
}

export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as RefreshTokenPayload;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("expired")) {
      throw new TokenExpiredError("Refresh token has expired — please log in again");
    }
    throw new TokenInvalidError("Refresh token is invalid");
  }
}

// ── Parse expiry string → milliseconds ───────────────────────────────────────
// Supports: "15m", "7d", "1h", "30s"
export function expiryToMs(expiry: string): number {
  const unit = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1), 10);
  const map: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * (map[unit] ?? 60_000);
}

