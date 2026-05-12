// =============================================================================
// useRelatedProducts — query hook for related products on PDP
//
// Accepts initialData from Astro SSR BFF call (getPDPBFF returns relatedProducts)
// so the section renders instantly. Background refetch kicks in after staleTime.
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { fetcher } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-keys";

// ── Schema ────────────────────────────────────────────────────────────────────

export const relatedProductSchema = z.object({
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

export const relatedProductsSchema = z.array(relatedProductSchema);

export type RelatedProduct = z.infer<typeof relatedProductSchema>;

// ── Hook ─────────────────────────────────────────────────────────────────────

interface UseRelatedProductsOptions {
  initialData?: RelatedProduct[];
}

export function useRelatedProducts(
  slug: string,
  options: UseRelatedProductsOptions = {}
) {
  const { initialData } = options;

  return useQuery({
    queryKey: queryKeys.products.related(slug),
    queryFn: () => fetcher(`/products/${slug}/related`, relatedProductsSchema),
    initialData: initialData ?? undefined,
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
    staleTime: 1000 * 60 * 10, // 10 min — related products rarely change
    enabled: !!slug,
  });
}

export type UseRelatedProductsReturn = ReturnType<typeof useRelatedProducts>;
