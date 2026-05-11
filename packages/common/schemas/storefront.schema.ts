// =============================================================================
// Storefront Response Schemas — Zod validation for what api-gateway sends back
// Used by: apps/web (parse fetch responses at the query layer)
// Import from: "@repo/common/schemas"
//
// WHY separate from product/user/order schemas?
//   Those schemas validate *input* to services (create/update payloads).
//   These schemas validate *output* from the gateway — serialized JSON with
//   string dates, computed fields, and slimmed-down shapes.
// =============================================================================

import { z } from "zod/v4";

// ── Pagination ────────────────────────────────────────────────────────────────

export const paginationMetaSchema = z.object({
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
  limit: z.number(),
  page: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export type StorefrontPaginationMeta = z.infer<typeof paginationMetaSchema>;

/**
 * Generic paginated API response schema builder.
 *
 * Usage:
 *   const reviewsPageSchema = paginatedResponseSchema(storefrontReviewSchema);
 *   type ReviewsPage = z.infer<typeof reviewsPageSchema>;
 */
export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
    success: z.literal(true),
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

/** Tokens returned by /auth/login and /auth/register */
export const authTokensSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
  refreshToken: z.string(),
});

// ── Address ───────────────────────────────────────────────────────────────────

/** Address shape as returned by the api-gateway to the storefront */
export const storefrontAddressSchema = z.object({
  city: z.string(),
  cityId: z.string().nullable(),
  country: z.string(),
  createdAt: z.string(),
  id: z.string(),
  isDefault: z.boolean(),
  label: z.string(),
  phone: z.string(),
  postalCode: z.string(),
  province: z.string(),
  recipientName: z.string(),
  street: z.string(),
  updatedAt: z.string(),
  userId: z.string(),
});

// ── Reviews ───────────────────────────────────────────────────────────────────

/** Rating summary (average + star breakdown) returned by /products/:id/summary */
export const storefrontRatingSummarySchema = z.object({
  average: z.number(),
  breakdown: z.record(z.string(), z.number()),
  count: z.number(),
});

/** Single review as returned by /products/:id/reviews */
export const storefrontReviewSchema = z.object({
  body: z.string().nullable(),
  createdAt: z.string(),
  id: z.string(),
  imageUrls: z.array(z.string()),
  isVerifiedPurchase: z.boolean(),
  orderId: z.string(),
  productId: z.string(),
  rating: z.number(),
  title: z.string().nullable(),
  userId: z.string(),
});

/** Paginated reviews response */
export const reviewsPageSchema = paginatedResponseSchema(storefrontReviewSchema);

export type ReviewsPage = z.infer<typeof reviewsPageSchema>;

// ── Orders ────────────────────────────────────────────────────────────────────

/** Lightweight order shape for list views */
export const storefrontOrderSchema = z.object({
  createdAt: z.string(),
  grandTotal: z.number(),
  id: z.string(),
  itemCount: z.number(),
  orderNumber: z.string(),
  status: z.string(),
});

/** Paginated orders response */
export const ordersPageSchema = paginatedResponseSchema(storefrontOrderSchema);

export type OrdersPage = z.infer<typeof ordersPageSchema>;
