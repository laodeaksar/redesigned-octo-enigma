// =============================================================================
// User Types
// Used by: auth-service, api-gateway, all services (JWT payload)
// =============================================================================

// ── Enums ─────────────────────────────────────────────────────────────────────

export type UserRole = "customer" | "admin" | "super_admin";

export type UserStatus = "active" | "inactive" | "banned" | "pending_verification";

export type OAuthProvider = "google" | "github";

// ── Core Entity ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-types ─────────────────────────────────────────────────────────────────

/** Stored in the database — includes sensitive fields */
export interface UserRecord extends User {
  passwordHash: string | null; // null for OAuth-only accounts
}

/** Safe to send to the client — no sensitive fields */
export type PublicUser = Omit<UserRecord, "passwordHash">;

/** Minimal profile shown in public contexts (e.g. review author) */
export type UserSummary = Pick<User, "id" | "name" | "avatarUrl">;

// ── OAuth ─────────────────────────────────────────────────────────────────────

export interface OAuthAccount {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

// ── Sessions & Tokens ─────────────────────────────────────────────────────────

/** Payload encoded inside a JWT access token */
export interface JwtPayload {
  sub: string;       // userId
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/** Payload encoded inside a JWT refresh token */
export interface RefreshTokenPayload {
  sub: string;       // userId
  jti: string;       // unique token ID (for revocation)
  iat: number;
  exp: number;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}

/** Injected by api-gateway into internal request headers */
export interface RequestUser {
  id: string;
  email: string;
  role: UserRole;
}

// ── Address ───────────────────────────────────────────────────────────────────

export interface Address {
  id: string;
  userId: string;
  label: string;           // e.g. "Home", "Office"
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AddressSummary = Pick<
  Address,
  "id" | "label" | "recipientName" | "phone" | "street" | "city" | "province" | "postalCode" | "country"
>;
