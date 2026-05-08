import { useEffect } from "react";
import {
  $recentlyViewed,
  hydrateRecentlyViewed,
  type RecentProduct,
} from "@/stores/recentlyViewed.store";
import { useStore } from "@nanostores/react";

import { formatIDR } from "@/lib/utils";

/*function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}*/

function PriceLabel({ low, high }: { low: number; high: number }) {
  if (low === high) {
    return (
      <span className="font-semibold text-gray-900">{formatIDR(low)}</span>
    );
  }
  return (
    <span className="font-semibold text-gray-900">
      {formatIDR(low)} – {formatIDR(high)}
    </span>
  );
}

function ProductCard({
  product,
  currentSlug,
}: {
  product: RecentProduct;
  currentSlug?: string;
}) {
  const isCurrent = product.slug === currentSlug;
  return (
    <a
      aria-current={isCurrent ? "page" : undefined}
      className={`group flex w-36 shrink-0 flex-col overflow-hidden rounded-xl border bg-white transition-all hover:-translate-y-0.5 hover:shadow-md sm:w-44 ${
        isCurrent ? "border-brand-300 ring-brand-300 ring-1" : "border-gray-100"
      }`}
      href={`/products/${product.slug}`}
    >
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
        {isCurrent && (
          <div className="bg-brand-500 absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white">
            Sedang dilihat
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <p className="line-clamp-2 text-xs leading-snug font-medium text-gray-800">
          {product.name}
        </p>
        <p className="mt-auto text-xs">
          <PriceLabel high={product.highestPrice} low={product.lowestPrice} />
        </p>
      </div>
    </a>
  );
}

interface Props {
  currentSlug?: string;
  title?: string;
}

export default function RecentlyViewed({
  currentSlug,
  title = "Terakhir Dilihat",
}: Props) {
  useEffect(() => {
    hydrateRecentlyViewed();
  }, []);

  const items = useStore($recentlyViewed);

  const visible = currentSlug
    ? items.filter(p => p.slug !== currentSlug).slice(0, 8)
    : items.slice(0, 8);

  if (visible.length === 0) {
    return null;
  }

  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            className="text-xs text-gray-400 transition-colors hover:text-gray-600"
            onClick={() => {
              if (typeof localStorage !== "undefined") {
                localStorage.removeItem("recently_viewed");
              }
              $recentlyViewed.set([]);
            }}
            type="button"
          >
            Hapus riwayat
          </button>
        </div>
        <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2">
          {visible.map(p => (
            <ProductCard currentSlug={currentSlug} key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
