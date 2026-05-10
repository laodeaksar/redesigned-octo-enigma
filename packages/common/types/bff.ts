// =============================================================================
// BFF (Backend-for-Frontend) response types and Zod validation schemas
// Used by: apps/api-gateway (validation before return), apps/web/src/lib/api (parsing)
// Import from: "@repo/common/types"
// =============================================================================

import { z } from "zod/v4";

// ── Inline Zod schemas mirroring Storefront shapes ───────────────────────────
// Validate upstream product-service JSON at the BFF boundary.
// Kept thin and BFF-focused — not duplicating the full domain schemas.

const storefrontProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "draft", "archived"]),
  categoryId: z.string(),
  primaryImage: z.string().nullable(),
  lowestPrice: z.coerce.number(),
  highestPrice: z.coerce.number(),
  // product-service returns totalStock as a numeric string from Drizzle aggregation
  totalStock: z.coerce.number(),
  tags: z.array(z.string()),
  createdAt: z.string(),
});

const storefrontCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  parentId: z.string().nullable(),
});

// The product-service /products/slug/:slug endpoint returns a richer shape that
// does NOT include the aggregated list fields (totalStock, lowestPrice, etc.).
// This schema is standalone — it does not extend storefrontProductSchema.
const storefrontProductDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "draft", "archived"]),
  categoryId: z.string(),
  description: z.string(),
  shortDescription: z.string().nullable(),
  tags: z.array(z.string()),
  weight: z.number().nullable(),
  createdAt: z.string(),
  category: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
    })
    .nullable(),
  images: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      altText: z.string().nullable(),
      isPrimary: z.boolean(),
      sortOrder: z.number(),
    })
  ),
  variants: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sku: z.string(),
      price: z.coerce.number(),
      compareAtPrice: z.coerce.number().nullable(),
      stock: z.coerce.number(),
      isActive: z.boolean(),
      attributes: z.record(z.string(), z.string()),
    })
  ),
});

// ── BFF Response Schemas ──────────────────────────────────────────────────────

/** Response shape for GET /bff/home */
export const homeBFFResponseSchema = z.object({
  featuredProducts: z.array(storefrontProductSchema),
  categories: z.array(storefrontCategorySchema),
});

/** Response shape for GET /bff/pdp/:slug */
export const pdpBFFResponseSchema = z.object({
  product: storefrontProductDetailSchema,
  relatedProducts: z.array(storefrontProductSchema),
});

// ── TypeScript Types ──────────────────────────────────────────────────────────

export type HomeBFFResponse = z.infer<typeof homeBFFResponseSchema>;
export type PDPBFFResponse = z.infer<typeof pdpBFFResponseSchema>;
