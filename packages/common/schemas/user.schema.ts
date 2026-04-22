// =============================================================================
// User Schemas
// Used by: auth-service (validation), apps/web & apps/admin (forms)
// =============================================================================

import { z } from "zod";

import {
  addressSchema,
  emailSchema,
  phoneSchema,
  shortStringSchema,
  slugSchema,
  uuidSchema,
} from "./common.schema";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const userRoleSchema = z.enum(["customer", "admin", "super_admin"]);

export const userStatusSchema = z.enum([
  "active",
  "inactive",
  "banned",
  "pending_verification",
]);

export const oauthProviderSchema = z.enum(["google", "github"]);

// ── Register ──────────────────────────────────────────────────────────────────

export const registerSchema = z
  .object({
    name: shortStringSchema
      .min(2, { message: "Name must be at least 2 characters" })
      .max(100),
    email: emailSchema,
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .max(72, { message: "Password cannot exceed 72 characters" })
      .regex(/[A-Z]/, {
        message: "Password must contain at least one uppercase letter",
      })
      .regex(/[a-z]/, {
        message: "Password must contain at least one lowercase letter",
      })
      .regex(/[0-9]/, { message: "Password must contain at least one number" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// ── Login ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required" }),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ── Refresh Token ─────────────────────────────────────────────────────────────

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, { message: "Refresh token is required" }),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// ── Forgot / Reset Password ───────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .max(72)
      .regex(/[A-Z]/, {
        message: "Password must contain at least one uppercase letter",
      })
      .regex(/[a-z]/, {
        message: "Password must contain at least one lowercase letter",
      })
      .regex(/[0-9]/, { message: "Password must contain at least one number" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ── Change Password ───────────────────────────────────────────────────────────

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "Current password is required" }),
    newPassword: z
      .string()
      .min(8)
      .max(72)
      .regex(/[A-Z]/)
      .regex(/[a-z]/)
      .regex(/[0-9]/),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ── Update Profile ────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: shortStringSchema.min(2).max(100).optional(),
  phone: phoneSchema.optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ── Admin: Update User ────────────────────────────────────────────────────────

export const adminUpdateUserSchema = z.object({
  name: shortStringSchema.min(2).max(100).optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  emailVerified: z.boolean().optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

// ── Verify Email ──────────────────────────────────────────────────────────────

export const verifyEmailSchema = z.object({
  token: z.string().min(1, { message: "Verification token is required" }),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ── Address ───────────────────────────────────────────────────────────────────

export const createAddressSchema = addressSchema;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = addressSchema.partial();
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

// ── List / Filter Users (admin) ───────────────────────────────────────────────

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(100).optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  sortBy: z
    .enum(["name", "email", "createdAt", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
