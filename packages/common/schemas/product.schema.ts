// =============================================================================
// Product Schemas
// Used by: product-service (validation), apps/web & apps/admin (forms)
// =============================================================================

import { z } from "zod";

import {
  commaSeparatedSchema,
  idrAmountSchema,
  imageSchema,
  longStringSchema,
  nonNegativeIntSchema,
  positiveIdrAmountSchema,
  positiveIntSchema,
  ratingSchema,
  shortStringSchema,
  slugSchema,
  sortOrderSchema,
  uuidSchema,
  weightSchema,
} from "./common.schema";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const productStatusSchema = z.enum(["active", "draft", "archived"]);

export const stockStatusSchema = z.enum([
  "in_stock",
  "low_stock",
  "out_of_stock",
]);

export const stockAdjustmentReasonSchema = z.enum([
  "order_placed",
  "order_cancelled",
  "order_returned",
  "manual_adjustment",
  "restock",
]);

// ── Category ──────────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: shortStringSchema.max(100),
  slug: slugSchema,
  description: z.string().max(1000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  parentId: uuidSchema.nullable().optional(),
  sortOrder: nonNegativeIntSchema.default(0),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ── Product Variant ───────────────────────────────────────────────────────────

export const productVariantSchema = z
  .object({
    sku: shortStringSchema.max(100).regex(/^[A-Za-z0-9_-]+$/, {
      message:
        "SKU can only contain letters, numbers, hyphens, and underscores",
    }),
    name: shortStringSchema.max(200),
    /** Key-value attribute pairs e.g. { color: "red", size: "XL" } */
    attributes: z
      .record(z.string(), z.string())
      .refine((v) => Object.keys(v).length > 0, {
        message: "At least one attribute is required",
      }),
    price: positiveIdrAmountSchema,
    compareAtPrice: positiveIdrAmountSchema.nullable().optional(),
    stock: nonNegativeIntSchema.default(0),
    weight: weightSchema.nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => data.compareAtPrice == null || data.compareAtPrice > data.price,
    {
      message: "Compare-at price must be greater than the selling price",
      path: ["compareAtPrice"],
    },
  );

export type ProductVariantInput = z.infer<typeof productVariantSchema>;

export const updateVariantSchema = productVariantSchema
  .omit({ sku: true })
  .partial();
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;

// ── Create Product ────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: shortStringSchema
    .min(3, { message: "Product name must be at least 3 characters" })
    .max(255),
  slug: slugSchema,
  description: longStringSchema,
  shortDescription: z.string().max(500).nullable().optional(),
  status: productStatusSchema.default("draft"),
  categoryId: uuidSchema,
  tags: z
    .array(z.string().max(50).trim())
    .max(20, { message: "Cannot have more than 20 tags" })
    .default([]),
  weight: weightSchema.nullable().optional(),
  images: z
    .array(imageSchema)
    .min(1, { message: "At least one image is required" })
    .max(10, { message: "Cannot have more than 10 images" }),
  variants: z
    .array(productVariantSchema)
    .min(1, { message: "At least one variant is required" })
    .max(50, { message: "Cannot have more than 50 variants" })
    .refine(
      (variants) => {
        const skus = variants.map((v) => v.sku);
        return new Set(skus).size === skus.length;
      },
      { message: "All variant SKUs must be unique" },
    ),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// ── Update Product ────────────────────────────────────────────────────────────

export const updateProductSchema = createProductSchema
  .omit({ variants: true, images: true })
  .partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ── Stock Adjustment ──────────────────────────────────────────────────────────

export const stockAdjustmentSchema = z.object({
  variantId: uuidSchema,
  delta: z
    .number()
    .int()
    .refine((v) => v !== 0, { message: "Delta cannot be zero" }),
  reason: stockAdjustmentReasonSchema,
  referenceId: z.string().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

/** Batch stock deduction — used internally by order-service */
export const batchStockDeductSchema = z.object({
  orderId: z.string().min(1),
  items: z
    .array(
      z.object({
        variantId: uuidSchema,
        quantity: positiveIntSchema,
      }),
    )
    .min(1),
});

export type BatchStockDeductInput = z.infer<typeof batchStockDeductSchema>;

// ── Product Review ────────────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  productId: uuidSchema,
  orderId: z.string().min(1),
  rating: ratingSchema,
  title: z.string().max(150).nullable().optional(),
  body: z.string().max(2000).nullable().optional(),
  imageUrls: z
    .array(z.string().url())
    .max(5, { message: "Cannot attach more than 5 images" })
    .default([]),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// ── Query / Filter ────────────────────────────────────────────────────────────

export const listProductsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().max(200).optional(),
    categoryId: uuidSchema.optional(),
    /** Comma-separated category IDs */
    categoryIds: commaSeparatedSchema.optional(),
    status: productStatusSchema.optional(),
    /** Comma-separated tags */
    tags: commaSeparatedSchema.optional(),
    minPrice: idrAmountSchema.optional(),
    maxPrice: idrAmountSchema.optional(),
    stockStatus: stockStatusSchema.optional(),
    sortBy: z
      .enum(["name", "createdAt", "updatedAt", "lowestPrice", "totalStock"])
      .default("createdAt"),
    sortOrder: sortOrderSchema,
  })
  .refine(
    (data) =>
      data.minPrice == null ||
      data.maxPrice == null ||
      data.minPrice <= data.maxPrice,
    {
      message: "minPrice cannot be greater than maxPrice",
      path: ["minPrice"],
    },
  );

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export const searchProductsQuerySchema = z.object({
  q: z.string().min(1).max(200),
  categoryId: uuidSchema.optional(),
  minPrice: idrAmountSchema.optional(),
  maxPrice: idrAmountSchema.optional(),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type SearchProductsQuery = z.infer<typeof searchProductsQuerySchema>;
