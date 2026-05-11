// =============================================================================
// ProductGrid — React island, client:load
//
// Renders the product listing grid with TanStack Query.
// Accepts initialProducts from Astro SSR frontmatter as initialData so the
// first render is instant (no loading flash, SSR data shown immediately).
// Subsequent navigation triggers a background refetch when staleTime expires.
// =============================================================================

import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/lib/query-client";
import {
  useProducts,
  type ProductListResponse,
  type StorefrontProductItem,
} from "@/hooks/queries/useProducts";
import type { ProductListParams } from "@/lib/query-keys";
import { formatIDR } from "@/lib/utils";

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-gray-100 bg-white">
      <div className="aspect-square bg-gray-100" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 rounded bg-gray-100" />
        <div className="h-4 w-1/2 rounded bg-gray-100" />
        <div className="h-3 w-1/3 rounded bg-gray-100" />
      </div>
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: StorefrontProductItem }) {
  const isOutOfStock = product.totalStock === 0;

  return (
    <a
      className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white transition-shadow hover:shadow-md"
      href={`/products/${product.slug}`}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {product.primaryImage ? (
          <img
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            src={product.primaryImage}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-gray-200">
            📦
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-white">
              Stok Habis
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-gray-900">
          {product.name}
        </p>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">
            {formatIDR(product.lowestPrice)}
            {product.highestPrice > product.lowestPrice && (
              <span className="ml-0.5 text-xs font-normal text-gray-400">
                +
              </span>
            )}
          </span>
        </div>
        {product.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {product.tags.slice(0, 2).map((tag: string) => (
              <span
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-gray-400">
      <span className="text-6xl">🔍</span>
      <p className="font-medium">Produk tidak ditemukan</p>
      <a className="text-accent text-sm hover:underline" href="/products">
        Lihat semua produk
      </a>
    </div>
  );
}

// ── Grid ─────────────────────────────────────────────────────────────────────

interface ProductGridInnerProps {
  initialProducts?: ProductListResponse;
  params?: ProductListParams;
}

function ProductGridInner({ initialProducts, params }: ProductGridInnerProps) {
  const { data, isLoading, isError } = useProducts({ initialData: initialProducts, params });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
        Gagal memuat produk. Coba muat ulang halaman.
      </div>
    );
  }

  const products = data?.data ?? [];

  if (products.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {products.map((product: StorefrontProductItem) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// ── Export (with QueryClientProvider) ─────────────────────────────────────────

interface Props {
  initialProducts?: ProductListResponse;
  params?: ProductListParams;
}

export default function ProductGrid({ initialProducts, params }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <ProductGridInner initialProducts={initialProducts} params={params} />
    </QueryClientProvider>
  );
}
