// =============================================================================
// Auth service — business logic
// =============================================================================

import { randomBytes } from "node:crypto";

import {
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  TokenInvalidError,
} from "@repo/common/errors";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "@repo/common/schemas";
import { type DB, env } from "@/config";
import {
  publishPasswordResetRequested,
  publishUserRegistered,
} from "@/lib/events";
import {
  expiryToMs,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/lib/jwt";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByResetToken,
  findUserByVerificationToken,
  updateUser,
} from "@/modules/users/users.repository";

// ── Token helpers ─────────────────────────────────────────────────────────────

function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

function stripSensitive(
  user: NonNullable<Awaited<ReturnType<typeof findUserById>>>
) {
  const { passwordHash, emailVerificationToken, passwordResetToken, ...safe } =
    user;
  return safe;
}

// ── Register ──────────────────────────────────────────────────────────────────

export async function register(db: DB, input: RegisterInput) {
  const existing = await findUserByEmail(db, input.email);
  if (existing) {
    throw new EmailAlreadyExistsError(input.email);
  }

  const passwordHash = await hashPassword(input.password);
  const emailVerificationToken = generateToken();

  const user = await createUser(db, {
    email: input.email.toLowerCase(),
    name: input.name,
    passwordHash,
    role: "customer",
    status: "pending_verification",
    emailVerified: false,
    emailVerificationToken,
  });

  await publishUserRegistered({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  return { user: stripSensitive(user) };
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(db: DB, input: LoginInput) {
  const user = await findUserByEmail(db, input.email);

  // Always hash even if user not found — prevent timing attacks
  const dummyHash =
    "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const storedHash = user?.passwordHash ?? dummyHash;
  const isValid = await verifyPassword(input.password, storedHash);

  if (!(user && isValid)) {
    throw new InvalidCredentialsError();
  }

  if (!user.emailVerified) {
    throw new EmailNotVerifiedError();
  }

  // Check ban status via both legacy status field and admin plugin's banned field
  const isBanned =
    user.status === "banned" ||
    (user.banned === true &&
      (user.banExpires === null || user.banExpires > new Date()));

  if (isBanned) {
    const reason = user.banReason ? `: ${user.banReason}` : "";
    throw new InvalidCredentialsError(
      `Your account has been suspended${reason}`
    );
  }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ sub: user.id, email: user.email, role: user.role }),
    signRefreshToken({ sub: user.id, jti: generateToken(16) }),
  ]);

  return {
    user: stripSensitive(user),
    accessToken,
    refreshToken,
    expiresIn: expiryToMs(env.JWT_ACCESS_EXPIRES_IN) / 1000, // seconds
  };
}

// ── Refresh Token ─────────────────────────────────────────────────────────────

export async function refreshTokens(db: DB, refreshToken: string) {
  const payload = await verifyRefreshToken(refreshToken);

  const user = await findUserById(db, payload.sub);
  if (!user || user.status === "banned") {
    throw new TokenInvalidError();
  }

  const [newAccessToken, newRefreshToken] = await Promise.all([
    signAccessToken({ sub: user.id, email: user.email, role: user.role }),
    signRefreshToken({ sub: user.id, jti: generateToken(16) }),
  ]);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: expiryToMs(env.JWT_ACCESS_EXPIRES_IN) / 1000,
  };
}

// ── Verify Email ──────────────────────────────────────────────────────────────

export async function verifyEmail(db: DB, token: string) {
  const user = await findUserByVerificationToken(db, token);
  if (!user) {
    throw new TokenInvalidError(
      "Email verification token is invalid or expired"
    );
  }

  await updateUser(db, user.id, {
    emailVerified: true,
    status: "active",
    emailVerificationToken: null,
  });

  return { message: "Email verified successfully" };
}

// ── Forgot Password ───────────────────────────────────────────────────────────

export async function forgotPassword(db: DB, input: ForgotPasswordInput) {
  const user = await findUserByEmail(db, input.email);

  // Always return success — don't reveal whether email exists
  if (!user) {
    return {
      message: "If that email is registered, a reset link has been sent",
    };
  }

  const resetToken = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  await updateUser(db, user.id, { passwordResetToken: resetToken });

  await publishPasswordResetRequested({
    userId: user.id,
    email: user.email,
    resetToken,
    expiresAt: expiresAt.toISOString(),
  });

  return { message: "If that email is registered, a reset link has been sent" };
}

// ── Reset Password ────────────────────────────────────────────────────────────

export async function resetPassword(db: DB, input: ResetPasswordInput) {
  const user = await findUserByResetToken(db, input.token);
  if (!user) {
    throw new TokenInvalidError("Password reset token is invalid or expired");
  }

  const passwordHash = await hashPassword(input.password);

  await updateUser(db, user.id, {
    passwordHash,
    passwordResetToken: null,
    status: "active",
  });

  return { message: "Password reset successfully" };
}
