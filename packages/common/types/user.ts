// =============================================================================
// User Types
// Used by: auth-service, api-gateway, all services (JWT payload)
// =============================================================================

// ── Enums ─────────────────────────────────────────────────────────────────────

export type UserRole = "customer" | "admin" | "super_admin";

export type UserStatus =
  | "active"
  | "inactive"
  | "banned"
  | "pending_verification";

export type OAuthProvider = "google" | "github";

// ── Core Entity ───────────────────────────────────────────────────────────────

export interface User {
  avatarUrl: string | null;
  createdAt: Date;
  email: string;
  emailVerified: boolean;
  id: string;
  name: string;
  role: UserRole;
  status: UserStatus;
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
  accessToken: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  id: string;
  provider: OAuthProvider;
  providerAccountId: string;
  refreshToken: string | null;
  userId: string;
}

// ── Sessions & Tokens ─────────────────────────────────────────────────────────

/** Payload encoded inside a JWT access token */
export interface JwtPayload {
  email: string;
  exp: number;
  iat: number;
  role: UserRole;
  sub: string; // userId
}

/** Payload encoded inside a JWT refresh token */
export interface RefreshTokenPayload {
  exp: number;
  iat: number;
  jti: string; // unique token ID (for revocation)
  sub: string; // userId
}

export interface Session {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  ipAddress: string | null;
  token: string;
  userAgent: string | null;
  userId: string;
}

/** Injected by api-gateway into internal request headers */
export interface RequestUser {
  email: string;
  id: string;
  role: UserRole;
}

// ── Address ───────────────────────────────────────────────────────────────────

export interface Address {
  city: string;
  country: string;
  createdAt: Date;
  id: string;
  isDefault: boolean;
  label: string; // e.g. "Home", "Office"
  phone: string;
  postalCode: string;
  province: string;
  recipientName: string;
  street: string;
  updatedAt: Date;
  userId: string;
}

export type AddressSummary = Pick<
  Address,
  | "id"
  | "label"
  | "recipientName"
  | "phone"
  | "street"
  | "city"
  | "province"
  | "postalCode"
  | "country"
>;
