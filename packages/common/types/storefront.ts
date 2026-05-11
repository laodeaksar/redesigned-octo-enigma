// =============================================================================
// Storefront API Response Types
// Used by: apps/web (Astro storefront), any future checkout/Fresh app
//
// WHY separate from domain types (product.ts, order.ts, etc.)?
//   Domain types model the database record — they use Date objects and include
//   every field the service knows about.
//
//   These types model what the api-gateway actually returns to HTTP clients:
//     - Dates are ISO strings (JSON serialization)
//     - Products include computed/denormalized fields added by the service
//       (lowestPrice, highestPrice, totalStock, primaryImage)
//     - Shapes are slimmed down to what the frontend actually needs
//
// Naming convention: prefix with `Storefront` to avoid conflicts with the
// domain types exported from product.ts / order.ts / user.ts / payment.ts.
// apps/web re-exports these as plain aliases (Product, Category, etc.) for
// backward compatibility with existing .astro pages and React islands.
// =============================================================================

// ── Product ───────────────────────────────────────────────────────────────────

export type StorefrontProductStatus = "active" | "draft" | "archived";

/** Lightweight product shape for listing pages and search results */
export interface StorefrontProduct {
  categoryId: string;
  createdAt: string;
  highestPrice: number;
  id: string;
  lowestPrice: number;
  name: string;
  /** URL of the primary product image, null if no images uploaded */
  primaryImage: string | null;
  slug: string;
  status: StorefrontProductStatus;
  tags: string[];
  totalStock: number;
}

export interface StorefrontVariant {
  attributes: Record<string, string>;
  compareAtPrice: number | null;
  id: string;
  isActive: boolean;
  name: string;
  price: number;
  sku: string;
  stock: number;
}

export interface StorefrontProductImage {
  altText: string | null;
  id: string;
  isPrimary: boolean;
  sortOrder: number;
  url: string;
}

/** Full product shape for Product Detail Pages (PDP) */
export interface StorefrontProductDetail extends StorefrontProduct {
  category: { id: string; name: string; slug: string } | null;
  description: string;
  images: StorefrontProductImage[];
  shortDescription: string | null;
  variants: StorefrontVariant[];
  weight: number | null;
}

// ── Category ──────────────────────────────────────────────────────────────────

export interface StorefrontCategory {
  description: string | null;
  id: string;
  imageUrl: string | null;
  name: string;
  parentId: string | null;
  slug: string;
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface StorefrontUser {
  avatarUrl: string | null;
  /** Only set when user is banned via the admin plugin */
  banExpires: string | null;
  banReason: string | null;
  banned: boolean | null;
  email: string;
  emailVerified: boolean;
  /** True when the account has a password hash (i.e. email+password auth works).
   *  False for OAuth-only accounts that have never set a password. */
  hasPassword: boolean;
  id: string;
  name: string;
  role: string;
  status: string;
}

// ── Order ─────────────────────────────────────────────────────────────────────

/** Lightweight order for list views */
export interface StorefrontOrder {
  createdAt: string;
  grandTotal: number;
  id: string;
  itemCount: number;
  orderNumber: string;
  status: string;
}

export interface StorefrontOrderItem {
  product: {
    imageUrl: string | null;
    name: string;
    price: number;
    productId?: string;
    sku: string;
    variantName: string;
  };
  quantity: number;
  subtotal: number;
  unitPrice: number;
}

export interface StorefrontOrderShipping {
  address: {
    city: string;
    phone: string;
    postalCode: string;
    province: string;
    recipientName: string;
    street: string;
  };
  cost: number;
  courier: string;
  deliveredAt: string | null;
  estimatedDays?: number;
  service: string;
  shippedAt: string | null;
  trackingNumber: string | null;
}

export interface StorefrontOrderPricing {
  discountTotal: number;
  grandTotal: number;
  shippingCost: number;
  subtotal: number;
  taxTotal: number;
}

export interface StorefrontAppliedDiscount {
  amount: number;
  code: string;
  type: string;
  value: number;
}

export interface StorefrontOrderStatusEvent {
  note?: string;
  status: string;
  timestamp: string;
}

/** Full order shape for the Order Detail page */
export interface StorefrontOrderDetail extends StorefrontOrder {
  cancellationNote?: string | null;
  cancellationReason?: string | null;
  customerNote?: string | null;
  discounts?: StorefrontAppliedDiscount[];
  expiresAt: string;
  items: StorefrontOrderItem[];
  paymentId: string | null;
  pricing: StorefrontOrderPricing;
  shipping: StorefrontOrderShipping;
  statusHistory?: StorefrontOrderStatusEvent[];
  updatedAt: string;
  userId: string;
}

// ── Payment ───────────────────────────────────────────────────────────────────

export interface StorefrontVirtualAccount {
  bank: string;
  expiresAt: string;
  vaNumber: string;
}

export interface StorefrontEWallet {
  expiresAt: string;
  provider: string;
  qrCodeUrl: string | null;
}

export interface StorefrontPayment {
  amount: number;
  eWallet: StorefrontEWallet | null;
  expiresAt: string;
  id: string;
  method: string | null;
  orderId: string;
  snapRedirectUrl: string | null;
  snapToken: string | null;
  status: string;
  virtualAccount: StorefrontVirtualAccount | null;
}

// ── Wishlist ──────────────────────────────────────────────────────────────────

export interface StorefrontWishlistItem {
  createdAt: string;
  id: string;
  product: StorefrontProduct;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export interface StorefrontReview {
  body: string | null;
  createdAt: string;
  id: string;
  imageUrls: string[];
  isVerifiedPurchase: boolean;
  orderId: string;
  productId: string;
  rating: number;
  title: string | null;
  userId: string;
}

export interface StorefrontRatingSummary {
  average: number;
  breakdown: Record<string, number>;
  count: number;
}

// ── Address ───────────────────────────────────────────────────────────────────

/** Shipping address as returned by the api-gateway to the storefront (string dates + cityId) */
export interface StorefrontAddress {
  city: string;
  cityId: string | null;
  country: string;
  createdAt: string;
  id: string;
  isDefault: boolean;
  label: string;
  phone: string;
  postalCode: string;
  province: string;
  recipientName: string;
  street: string;
  updatedAt: string;
  userId: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

/** Tokens returned by /auth/login and /auth/register */
export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

// ── Cart (client-side only, localStorage-backed) ──────────────────────────────

export interface StorefrontCartItem {
  imageUrl: string | null;
  price: number;
  productName: string;
  quantity: number;
  sku: string;
  variantId: string;
  variantName: string;
}
