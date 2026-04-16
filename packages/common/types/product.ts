// =============================================================================
// Product Types
// Used by: product-service, order-service, apps/web, apps/admin
// =============================================================================

// ── Enums ─────────────────────────────────────────────────────────────────────

export type ProductStatus = "active" | "draft" | "archived";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

// ── Category ──────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;     // null = root category
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CategorySummary = Pick<Category, "id" | "name" | "slug">;

export interface CategoryTree extends Category {
  children: CategoryTree[];
}

// ── Product Image ─────────────────────────────────────────────────────────────

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

// ── Product Variant ───────────────────────────────────────────────────────────

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;                // e.g. "Red / XL"
  attributes: Record<string, string>; // e.g. { color: "red", size: "XL" }
  price: number;               // in IDR, integer (no decimals)
  compareAtPrice: number | null;
  stock: number;
  weight: number | null;       // in grams
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductVariantSummary = Pick<
  ProductVariant,
  "id" | "sku" | "name" | "attributes" | "price" | "compareAtPrice" | "stock" | "isActive"
>;

// ── Product ───────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  status: ProductStatus;
  categoryId: string;
  tags: string[];
  weight: number | null;       // in grams (used when no variant weight)
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;      // soft delete
}

/** Full product with all relations — used in detail pages & admin */
export interface ProductDetail extends Product {
  category: CategorySummary;
  images: ProductImage[];
  variants: ProductVariant[];
}

/** Lightweight product for listing pages & search results */
export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  categoryId: string;
  primaryImage: string | null;
  lowestPrice: number;
  highestPrice: number;
  totalStock: number;
  stockStatus: StockStatus;
  createdAt: Date;
}

/** Used inside an order line-item — snapshot at time of purchase */
export interface ProductSnapshot {
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  price: number;
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export interface StockAdjustment {
  variantId: string;
  delta: number;               // positive = restock, negative = deduction
  reason: StockAdjustmentReason;
  referenceId: string | null;  // orderId, returnId, etc.
  note: string | null;
  createdAt: Date;
}

export type StockAdjustmentReason =
  | "order_placed"
  | "order_cancelled"
  | "order_returned"
  | "manual_adjustment"
  | "restock";

// ── Review ────────────────────────────────────────────────────────────────────

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  orderId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string | null;
  imageUrls: string[];
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductReviewWithAuthor extends ProductReview {
  author: import("./user").UserSummary;
}

export interface ProductRatingSummary {
  productId: string;
  average: number;
  count: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}
