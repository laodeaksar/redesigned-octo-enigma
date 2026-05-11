// =============================================================================
// useProducts — query hook for product listing
//
// Accepts initialData (passed from Astro SSR frontmatter) so the first render
// is instant — no loading flash on the PLP.
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { api } from "@/lib/api";
import { type ProductListParams, queryKeys } from "@/lib/query-keys";

// ── Response schema ───────────────────────────────────────────────────────────

const storefrontProductSchema = z.object({
  categoryId: z.string(),
  createdAt: z.string(),
  highestPrice: z.number(),
  id: z.string(),
  lowestPrice: z.number(),
  name: z.string(),
  primaryImage: z.string().nullable(),
  slug: z.string(),
  status: z.enum(["active", "draft", "archived"]),
  tags: z.array(z.string()),
  totalStock: z.number(),
});

export const productListResponseSchema = z.object({
  data: z.array(storefrontProductSchema),
  meta: z.object({
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
    limit: z.number(),
    page: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  success: z.literal(true),
});

export type StorefrontProductItem = z.infer<typeof storefrontProductSchema>;

export type ProductListResponse = z.infer<typeof productListResponseSchema>;

// ── Hook ─────────────────────────────────────────────────────────────────────

interface UseProductsOptions {
  initialData?: ProductListResponse;
  params?: ProductListParams;
}

export function useProducts(options: UseProductsOptions = {}) {
  const { initialData, params } = options;

  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: async () => {
      const raw = await api.get<unknown>("/products", {
        params: {
          page: params?.page ?? 1,
          limit: 24,
          status: "active",
          search: params?.search || undefined,
          categoryId: params?.categoryId || undefined,
          sortBy: params?.sortBy || "createdAt",
          sortOrder: params?.sortOrder || "desc",
        },
      });
      return productListResponseSchema.parse(raw);
    },
    initialData: initialData ? initialData : undefined,
    // When initialData is provided (SSR), treat it as fresh for 5 minutes
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
    staleTime: 1000 * 60 * 5,
  });
}

export type UseProductsReturn = ReturnType<typeof useProducts>;
