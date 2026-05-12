// =============================================================================
// RelatedProducts — React island, client:visible
//
// Horizontal scrollable carousel of related products.
// ButtonGroup is used for the prev / next scroll navigation.
// SSR initialData from getPDPBFF means the section renders without a loading
// flash on first page load.
// =============================================================================

import { useRef } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/lib/query-client";
import {
  useRelatedProducts,
  type RelatedProduct,
} from "@/hooks/queries/useRelatedProducts";
import { formatIDR } from "@/lib/utils";
import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SCROLL_PX = 320;

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="w-44 shrink-0 animate-pulse overflow-hidden rounded-xl border border-gray-100 bg-white sm:w-52">
      <div className="aspect-square bg-gray-100" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 rounded bg-gray-100" />
        <div className="h-4 w-1/2 rounded bg-gray-100" />
      </div>
    </div>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────

function RelatedCard({ product }: { product: RelatedProduct }) {
  const isOutOfStock = product.totalStock === 0;

  return (
    <a
      className="group relative w-44 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white transition-shadow hover:shadow-md sm:w-52"
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
        <p className="mt-1.5 text-sm font-bold text-gray-900">
          {formatIDR(product.lowestPrice)}
          {product.highestPrice > product.lowestPrice && (
            <span className="ml-0.5 text-xs font-normal text-gray-400">+</span>
          )}
        </p>
        {product.tags.length > 0 && (
          <span className="mt-1.5 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {product.tags[0]}
          </span>
        )}
      </div>
    </a>
  );
}

// ── Inner component ───────────────────────────────────────────────────────────

interface RelatedProductsInnerProps {
  slug: string;
  initialData?: RelatedProduct[];
}

function RelatedProductsInner({ slug, initialData }: RelatedProductsInnerProps) {
  const { data: products = [], isLoading } = useRelatedProducts(slug, { initialData });
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "right" ? SCROLL_PX : -SCROLL_PX,
      behavior: "smooth",
    });
  };

  if (!isLoading && products.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
          Produk Terkait
        </h2>

        {/* ButtonGroup: prev / next scroll controls */}
        <ButtonGroup>
          <Button
            aria-label="Scroll kiri"
            onClick={() => scrollBy("left")}
            size="sm"
            variant="outline"
          >
            ←
          </Button>
          <Button
            aria-label="Scroll kanan"
            onClick={() => scrollBy("right")}
            size="sm"
            variant="outline"
          >
            →
          </Button>
        </ButtonGroup>
      </div>

      {/* Carousel */}
      <div
        className="flex gap-4 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={scrollRef}
      >
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
          : products.map(product => (
              <RelatedCard key={product.id} product={product} />
            ))}
      </div>
    </section>
  );
}

// ── Export (with QueryClientProvider) ─────────────────────────────────────────

interface Props {
  slug: string;
  initialData?: RelatedProduct[];
}

export default function RelatedProducts({ slug, initialData }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <RelatedProductsInner slug={slug} initialData={initialData} />
    </QueryClientProvider>
  );
}
