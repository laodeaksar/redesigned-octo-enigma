// =============================================================================
// Auth routes
//
//  POST /auth/register
//  POST /auth/login
//  POST /auth/logout
//  POST /auth/refresh
//  POST /auth/verify-email
//  POST /auth/forgot-password
//  POST /auth/reset-password
// =============================================================================

import Elysia, { t } from "elysia";

import { databasePlugin } from "@/plugins/database.plugin";
import { jwtMiddleware } from "@/middleware/jwt.middleware";
import * as controller from "./auth.controller";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(databasePlugin)

  // ── Register ───────────────────────────────────────────────────────────────
  .post(
    "/register",
    ({ db, body }) => controller.handleRegister(db, body),
    {
      body: t.Object({
        name: t.String({ minLength: 2, maxLength: 100 }),
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8, maxLength: 72 }),
        confirmPassword: t.String(),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Register a new customer account",
      },
    }
  )

  // ── Login ──────────────────────────────────────────────────────────────────
  .post(
    "/login",
    ({ db, body }) => controller.handleLogin(db, body),
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Log in with email and password",
      },
    }
  )

  // ── Logout — stateless JWT, just acknowledge ───────────────────────────────
  .post(
    "/logout",
    () => ({ success: true, data: { message: "Logged out successfully" } }),
    {
      detail: {
        tags: ["Auth"],
        summary: "Logout (client must discard tokens)",
      },
    }
  )

  // ── Refresh tokens ─────────────────────────────────────────────────────────
  .post(
    "/refresh",
    ({ db, body }) => controller.handleRefresh(db, body),
    {
      body: t.Object({
        refreshToken: t.String({ minLength: 1 }),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Exchange a refresh token for a new access + refresh token pair",
      },
    }
  )

  // ── Verify email ───────────────────────────────────────────────────────────
  .post(
    "/verify-email",
    ({ db, body }) => controller.handleVerifyEmail(db, body),
    {
      body: t.Object({ token: t.String({ minLength: 1 }) }),
      detail: {
        tags: ["Auth"],
        summary: "Verify email address using the token sent via email",
      },
    }
  )

  // ── Forgot password ────────────────────────────────────────────────────────
  .post(
    "/forgot-password",
    ({ db, body }) => controller.handleForgotPassword(db, body),
    {
      body: t.Object({ email: t.String({ format: "email" }) }),
      detail: {
        tags: ["Auth"],
        summary: "Request a password reset link",
      },
    }
  )

  // ── Reset password ─────────────────────────────────────────────────────────
  .post(
    "/reset-password",
    ({ db, body }) => controller.handleResetPassword(db, body),
    {
      body: t.Object({
        token: t.String({ minLength: 1 }),
        password: t.String({ minLength: 8, maxLength: 72 }),
        confirmPassword: t.String(),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Reset password using a valid reset token",
      },
    }
  )

  // ── Get current authenticated user (me) ───────────────────────────────────
  .use(jwtMiddleware)
  .get(
    "/me",
    async ({ db, user }) => {
      const { findUserById } = await import(
        "@/modules/users/users.repository"
      );
      const { success } = await import("@repo/common/schemas");
      const { UserNotFoundError } = await import("@repo/common/errors");

      const found = await findUserById(db, user.id);
      if (!found) throw new UserNotFoundError();

      const { passwordHash, emailVerificationToken, passwordResetToken, ...safe } =
        found;
      return success(safe);
    },
    {
      detail: {
        tags: ["Auth"],
        summary: "Get the currently authenticated user",
        security: [{ bearerAuth: [] }],
      },
    }
  );

