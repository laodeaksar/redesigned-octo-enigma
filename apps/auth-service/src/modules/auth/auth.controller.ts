// =============================================================================
// Auth controller — request handlers (thin layer over service)
// =============================================================================

import { success } from "@repo/common/schemas";
import {
  safeParse,
} from "@repo/common/errors";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@repo/common/schemas";

import * as authService from "./auth.service";
import type { DB } from "@/config";

export async function handleRegister(db: DB, body: unknown) {
  const input = safeParse(registerSchema, body);
  const result = await authService.register(db, input);
  return success(result, "Registration successful. Please verify your email.");
}

export async function handleLogin(db: DB, body: unknown) {
  const input = safeParse(loginSchema, body);
  const result = await authService.login(db, input);
  return success(result, "Login successful");
}

export async function handleRefresh(db: DB, body: unknown) {
  const { refreshToken } = safeParse(refreshTokenSchema, body);
  const result = await authService.refreshTokens(db, refreshToken);
  return success(result);
}

export async function handleVerifyEmail(db: DB, body: unknown) {
  const { token } = safeParse(verifyEmailSchema, body);
  const result = await authService.verifyEmail(db, token);
  return success(result);
}

export async function handleForgotPassword(db: DB, body: unknown) {
  const input = safeParse(forgotPasswordSchema, body);
  const result = await authService.forgotPassword(db, input);
  return success(result);
}

export async function handleResetPassword(db: DB, body: unknown) {
  const input = safeParse(resetPasswordSchema, body);
  const result = await authService.resetPassword(db, input);
  return success(result);
}

