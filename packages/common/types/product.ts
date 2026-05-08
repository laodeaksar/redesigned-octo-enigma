// =============================================================================
// Product Types
// Used by: product-service, order-service, apps/web, apps/admin
// =============================================================================

// ── Enums ─────────────────────────────────────────────────────────────────────

export type ProductStatus = "active" | "draft" | "archived";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

// ── Category ──────────────────────────────────────────────────────────────────

export interface Category {
  createdAt: Date;
  description: string | null;
  id: string;
  imageUrl: string | null;
  name: string;
  parentId: string | null; // null = root category
  slug: string;
  sortOrder: number;
  updatedAt: Date;
}

export type CategorySummary = Pick<Category, "id" | "name" | "slug">;

export interface CategoryTree extends Category {
  children: CategoryTree[];
}

// ── Product Image ─────────────────────────────────────────────────────────────

export interface ProductImage {
  altText: string | null;
  id: string;
  isPrimary: boolean;
  productId: string;
  sortOrder: number;
  url: string;
}

// ── Product Variant ───────────────────────────────────────────────────────────

export interface ProductVariant {
  attributes: Record<string, string>; // e.g. { color: "red", size: "XL" }
  compareAtPrice: number | null;
  createdAt: Date;
  id: string;
  isActive: boolean;
  name: string; // e.g. "Red / XL"
  price: number; // in IDR, integer (no decimals)
  productId: string;
  sku: string;
  stock: number;
  updatedAt: Date;
  weight: number | null; // in grams
}

export type ProductVariantSummary = Pick<
  ProductVariant,
  | "id"
  | "sku"
  | "name"
  | "attributes"
  | "price"
  | "compareAtPrice"
  | "stock"
  | "isActive"
>;

// ── Product ───────────────────────────────────────────────────────────────────

export interface Product {
  categoryId: string;
  createdAt: Date;
  deletedAt: Date | null; // soft delete
  description: string;
  id: string;
  name: string;
  shortDescription: string | null;
  slug: string;
  status: ProductStatus;
  tags: string[];
  updatedAt: Date;
  weight: number | null; // in grams (used when no variant weight)
}

/** Full product with all relations — used in detail pages & admin */
export interface ProductDetail extends Product {
  category: CategorySummary;
  images: ProductImage[];
  variants: ProductVariant[];
}

/** Lightweight product for listing pages & search results */
export interface ProductSummary {
  categoryId: string;
  createdAt: Date;
  highestPrice: number;
  id: string;
  lowestPrice: number;
  name: string;
  primaryImage: string | null;
  slug: string;
  status: ProductStatus;
  stockStatus: StockStatus;
  totalStock: number;
}

/** Used inside an order line-item — snapshot at time of purchase */
export interface ProductSnapshot {
  imageUrl: string | null;
  name: string;
  price: number;
  productId: string;
  sku: string;
  variantId: string;
  variantName: string;
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export interface StockAdjustment {
  createdAt: Date;
  delta: number; // positive = restock, negative = deduction
  note: string | null;
  reason: StockAdjustmentReason;
  referenceId: string | null; // orderId, returnId, etc.
  variantId: string;
}

export type StockAdjustmentReason =
  | "order_placed"
  | "order_cancelled"
  | "order_returned"
  | "manual_adjustment"
  | "restock";

// ── Review ────────────────────────────────────────────────────────────────────

export interface ProductReview {
  body: string | null;
  createdAt: Date;
  id: string;
  imageUrls: string[];
  isVerifiedPurchase: boolean;
  orderId: string;
  productId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  updatedAt: Date;
  userId: string;
}

export interface ProductReviewWithAuthor extends ProductReview {
  author: import("./user").UserSummary;
}

export interface ProductRatingSummary {
  average: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  count: number;
  productId: string;
}
