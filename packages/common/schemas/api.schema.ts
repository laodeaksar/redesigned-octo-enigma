// =============================================================================
// API Schemas — Response builders, header validation, shared query params
// Used by: api-gateway middleware, all services (route params / headers)
// =============================================================================

import { z } from "zod";

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
  "x-user-email": z.string().email(),
  "x-user-role": z.enum(["customer", "admin", "super_admin"]),
  "x-request-id": z.string().uuid().optional(),
});

export type InternalRequestHeaders = z.infer<typeof internalRequestHeadersSchema>;

// ── Bearer Token ──────────────────────────────────────────────────────────────

/** Parse "Bearer <token>" Authorization header */
export const bearerTokenSchema = z
  .string()
  .min(1, { message: "Authorization header is required" })
  .regex(/^Bearer .+$/, {
    message: "Authorization header must be in format: Bearer <token>",
  })
  .transform((v) => v.replace(/^Bearer /, ""));

// ── Error Response ────────────────────────────────────────────────────────────

export const apiErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "INVALID_REQUEST",
  "INVALID_CREDENTIALS",
  "UNAUTHORIZED",
  "TOKEN_EXPIRED",
  "TOKEN_INVALID",
  "FORBIDDEN",
  "INSUFFICIENT_ROLE",
  "EMAIL_NOT_VERIFIED",
  "NOT_FOUND",
  "USER_NOT_FOUND",
  "PRODUCT_NOT_FOUND",
  "ORDER_NOT_FOUND",
  "PAYMENT_NOT_FOUND",
  "CONFLICT",
  "EMAIL_ALREADY_EXISTS",
  "SLUG_ALREADY_EXISTS",
  "INSUFFICIENT_STOCK",
  "ORDER_NOT_PAYABLE",
  "PAYMENT_ALREADY_PROCESSED",
  "INVALID_VOUCHER",
  "VOUCHER_EXPIRED",
  "VOUCHER_USAGE_LIMIT",
  "RATE_LIMIT_EXCEEDED",
  "INTERNAL_SERVER_ERROR",
  "SERVICE_UNAVAILABLE",
  "PAYMENT_GATEWAY_ERROR",
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

// ── Generic Search ────────────────────────────────────────────────────────────

export const globalSearchQuerySchema = z.object({
  q: z
    .string()
    .min(2, { message: "Search query must be at least 2 characters" })
    .max(200)
    .trim(),
  limit: z.coerce.number().int().positive().max(20).default(5),
});

export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;

// ── Health Check ──────────────────────────────────────────────────────────────

export const healthCheckResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  service: z.string(),
  version: z.string(),
  uptime: z.number(),
  timestamp: z.coerce.date(),
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
  meta: {
    total: number;
    page: number;
    limit: number;
  }
) {
  const totalPages = Math.ceil(meta.total / meta.limit);
  return {
    success: true as const,
    data: items,
    meta: {
      total: meta.total,
      page: meta.page,
      limit: meta.limit,
      totalPages,
      hasNextPage: meta.page < totalPages,
      hasPrevPage: meta.page > 1,
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
