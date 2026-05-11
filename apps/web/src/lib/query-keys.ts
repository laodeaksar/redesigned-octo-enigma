// =============================================================================
// TanStack Query — query key factory
//
// All cache keys are defined here as typed factory functions.
// Rules:
//   1. NEVER hardcode query keys outside this file.
//   2. Always use the factory — mutating the same key in multiple places will
//      cause stale data bugs that are hard to trace.
//   3. Narrow params (list filters, pagination) go at the end of the tuple so
//      invalidating the parent key (`queryKeys.products.all()`) also purges
//      all list variants.
//
// Usage:
//   useQuery({ queryKey: queryKeys.products.list({ page: 1 }) })
//   qc.invalidateQueries({ queryKey: queryKeys.cart() })
// =============================================================================

export type ProductListParams = {
  categoryId?: string;
  limit?: number;
  page?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
};

export type OrderListParams = {
  limit?: number;
  page?: number;
  status?: string;
};

const STOREFRONT = "storefront" as const;

export const queryKeys = {
  all: [STOREFRONT] as const,

  // ── Products ────────────────────────────────────────────────────────────────
  products: {
    all: ()       => [STOREFRONT, "products"]                      as const,
    list: (p?: ProductListParams) =>
                    [STOREFRONT, "products", "list", p ?? {}]     as const,
    detail: (slug: string) =>
                    [STOREFRONT, "products", "detail", slug]      as const,
    related: (slug: string) =>
                    [STOREFRONT, "products", "related", slug]     as const,
    search: (q: string) =>
                    [STOREFRONT, "products", "search", q]         as const,
  },

  // ── Cart ────────────────────────────────────────────────────────────────────
  cart: () => [STOREFRONT, "cart"] as const,

  // ── User / Auth ─────────────────────────────────────────────────────────────
  user: () => [STOREFRONT, "user"] as const,

  // ── Orders ──────────────────────────────────────────────────────────────────
  orders: {
    all: ()       => [STOREFRONT, "orders"]                        as const,
    list: (p?: OrderListParams) =>
                    [STOREFRONT, "orders", "list", p ?? {}]       as const,
    detail: (id: string) =>
                    [STOREFRONT, "orders", "detail", id]          as const,
  },

  // ── Wishlist ─────────────────────────────────────────────────────────────────
  wishlist: {
    all: ()       => [STOREFRONT, "wishlist"]                      as const,
    ids:  ()      => [STOREFRONT, "wishlist", "ids"]               as const,
  },

  // ── Reviews ──────────────────────────────────────────────────────────────────
  reviews: {
    all: ()                       => [STOREFRONT, "reviews"]           as const,
    // Parent key — invalidating this purges both summary and list for a product
    forProduct: (productId: string) =>
                    [STOREFRONT, "reviews", productId]             as const,
    // Rating summary (average + breakdown)
    summary: (productId: string) =>
                    [STOREFRONT, "reviews", productId, "summary"]  as const,
    // Paginated review list
    list: (productId: string, page = 1) =>
                    [STOREFRONT, "reviews", productId, "list", page] as const,
  },

  // ── Addresses ────────────────────────────────────────────────────────────────
  addresses: {
    all:  ()      => [STOREFRONT, "addresses"]                     as const,
    list: ()      => [STOREFRONT, "addresses", "list"]             as const,
  },

  // ── Shipping ─────────────────────────────────────────────────────────────────
  shipping: {
    rates: (cityId: string | undefined, weightGrams: number) =>
                    [STOREFRONT, "shipping", "rates", cityId ?? "", weightGrams] as const,
  },
} as const;
