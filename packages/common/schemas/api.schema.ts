// =============================================================================
// API Schemas — Response builders, header validation, shared query params
// Used by: api-gateway middleware, all services (route params / headers)
// =============================================================================

import { z } from "zod/v4";

import {
  objectIdSchema,
  slugSchema,
  uuidSchema,
} from "./common.schema";

// ── Route Params ──────────────────────────────────────────────────────────────

/** Generic UUID id param — e.g. GET /users/:id */
export const uuidParamSchema = z.object({
  id: uuidSchema,
});

export type UuidParam = z.infer<typeof uuidParamSchema>;

/** MongoDB ObjectId param — e.g. GET /orders/:id */
export const objectIdParamSchema = z.object({
  id: objectIdSchema,
});

export type ObjectIdParam = z.infer<typeof objectIdParamSchema>;

/** Slug param — e.g. GET /products/:slug */
export const slugParamSchema = z.object({
  slug: slugSchema,
});

export type SlugParam = z.infer<typeof slugParamSchema>;

// ── Internal Request Headers ──────────────────────────────────────────────────

/**
 * Headers injected by api-gateway after JWT validation.
 * Services read these instead of re-verifying the JWT.
 */
export const internalRequestHeadersSchema = z.object({
  "x-user-id": uuidSchema,
  "x-user-email": z.email(),
  "x-user-role": z.enum(["customer", "admin", "super_admin"]),
  "x-request-id": z.uuid(), // dibikin wajib buat tracing
}).passthrough(); // biar gak error kalau ada header lain

export type InternalRequestHeaders = z.infer<typeof internalRequestHeadersSchema>;

// ── Bearer Token ──────────────────────────────────────────────────────────────

/** Parse "Bearer <token>" Authorization header */
export const bearerTokenSchema = z
  .string()
  .min(1, { message: "Authorization header is required" })
  .regex(/^Bearer\s+\S+$/i, {
    message: "Authorization header must be in format: Bearer <token>",
  })
  .transform((v) => v.replace(/^Bearer\s+/i, ""));

// ── Error Response ────────────────────────────────────────────────────────────

/**
 * Error codes umum yang dipakai semua service.
 * Taruh di shared package.
 */
export const commonApiErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "INVALID_REQUEST",
  "UNAUTHORIZED", 
  "TOKEN_EXPIRED",
  "TOKEN_INVALID",
  "FORBIDDEN",
  "INSUFFICIENT_ROLE",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMIT_EXCEEDED",
  "INTERNAL_SERVER_ERROR",
  "SERVICE_UNAVAILABLE",
]);

export type CommonApiErrorCode = z.infer<typeof commonApiErrorCodeSchema>;

/**
 * Error codes domain Auth/User.
 * Bisa dipindah ke user-service kalau mau lebih strict.
 */
export const authApiErrorCodeSchema = z.enum([
  "INVALID_CREDENTIALS",
  "EMAIL_NOT_VERIFIED",
  "EMAIL_ALREADY_EXISTS",
  "USER_NOT_FOUND",
]);

export type AuthApiErrorCode = z.infer<typeof authApiErrorCodeSchema>;

/**
 * Error codes domain E-commerce: product, order, payment, voucher.
 * Bisa dipecah lagi per service kalau perlu.
 */
export const ecommerceApiErrorCodeSchema = z.enum([
  "PRODUCT_NOT_FOUND",
  "SLUG_ALREADY_EXISTS",
  "INSUFFICIENT_STOCK",
  "ORDER_NOT_FOUND",
  "ORDER_NOT_PAYABLE",
  "PAYMENT_NOT_FOUND",
  "PAYMENT_ALREADY_PROCESSED",
  "PAYMENT_GATEWAY_ERROR",
  "INVALID_VOUCHER",
  "VOUCHER_EXPIRED",
  "VOUCHER_USAGE_LIMIT",
]);

export type EcommerceApiErrorCode = z.infer<typeof ecommerceApiErrorCodeSchema>;

/**
 * Gabungan semua error code yang dikenal shared package.
 * Service boleh extend ini dengan z.union() di repo masing-masing.
 */
export const apiErrorCodeSchema = z.union([
  commonApiErrorCodeSchema,
  authApiErrorCodeSchema,
  ecommerceApiErrorCodeSchema,
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

/**
 * Helper untuk mapping error code ke HTTP status.
 * Pakai di error handler middleware.
 */
export function getHttpStatusFromErrorCode(code: ApiErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
    case "INVALID_REQUEST":
    case "INVALID_VOUCHER":
    case "VOUCHER_EXPIRED":
    case "VOUCHER_USAGE_LIMIT":
    case "ORDER_NOT_PAYABLE":
    case "INSUFFICIENT_STOCK":
      return 400;

    case "UNAUTHORIZED":
    case "TOKEN_EXPIRED":
    case "TOKEN_INVALID":
    case "INVALID_CREDENTIALS":
    case "EMAIL_NOT_VERIFIED":
      return 401;

    case "FORBIDDEN":
    case "INSUFFICIENT_ROLE":
      return 403;

    case "NOT_FOUND":
    case "USER_NOT_FOUND":
    case "PRODUCT_NOT_FOUND":
    case "ORDER_NOT_FOUND":
    case "PAYMENT_NOT_FOUND":
      return 404;

    case "CONFLICT":
    case "EMAIL_ALREADY_EXISTS":
    case "SLUG_ALREADY_EXISTS":
    case "PAYMENT_ALREADY_PROCESSED":
      return 409;

    case "RATE_LIMIT_EXCEEDED":
      return 429;

    case "SERVICE_UNAVAILABLE":
    case "PAYMENT_GATEWAY_ERROR":
      return 503;

    case "INTERNAL_SERVER_ERROR":
    default:
      return 500;
  }
}

// ── Generic Search ────────────────────────────────────────────────────────────

export const globalSearchQuerySchema = z.object({
  q: z
    .string()
    .min(2, { message: "Search query must be at least 2 characters" })
    .max(200)
    .trim(),
  limit: z.coerce
    .number({ error: "Limit must be a number" })
    .int()
    .positive({ message: "Limit must be > 0" })
    .max(20)
    .default(5),
});

export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;

// ── Health Check ──────────────────────────────────────────────────────────────

export const healthCheckResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  service: z.string(),
  version: z.string(),
  uptime: z.number(),
  timestamp: z.date(), // pakai string, bukan Date
  checks: z.record(z.string(), z.enum(["ok", "error"])),
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;

// ── Helpers — Response Builders ───────────────────────────────────────────────

/**
 * Wrap data in a standard success response shape.
 * Use in service route handlers:
 *   return c.json(success(user))
 */
export function success<T>(data: T, message?: string) {
  return { success: true as const, data, ...(message ? { message } : {}) };
}

/**
 * Wrap paginated data in a standard response shape.
 *   return c.json(paginated(items, { total, page, limit }))
 */
export function paginated<T>(
  items: T[],
  meta: { total: number; page: number; limit: number }
) {
  if (meta.limit <= 0) throw new Error("Limit must be > 0");
  if (meta.page <= 0) throw new Error("Page must be > 0");

  const totalPages = meta.total === 0 ? 0 : Math.ceil(meta.total / meta.limit);
  return {
    success: true as const,
    data: items,
    meta: {
      total: meta.total,
      page: meta.page,
      limit: meta.limit,
      totalPages,
      hasNextPage: totalPages > 0 && meta.page < totalPages,
      hasPrevPage: meta.page > 1 && totalPages > 0,
    },
  };
}

/**
 * Wrap an error in a standard error response shape.
 *   return c.json(failure("NOT_FOUND", "Product not found"), 404)
 */
export function failure(
  code: ApiErrorCode,
  message: string,
  details?: Array<{ field: string; message: string }>
) {
  return {
    success: false as const,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}

// Export response types biar reusable
export type ApiSuccessResponse<T> = ReturnType<typeof success<T>>;
export type ApiPaginatedResponse<T> = ReturnType<typeof paginated<T>>;
export type ApiErrorResponse = ReturnType<typeof failure>;