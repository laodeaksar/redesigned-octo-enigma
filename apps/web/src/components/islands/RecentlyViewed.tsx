import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { $recentlyViewed, hydrateRecentlyViewed, type RecentProduct } from "@/stores/recentlyViewed.store";

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function PriceLabel({ low, high }: { low: number; high: number }) {
  if (low === high) return <span className="font-semibold text-gray-900">{formatIDR(low)}</span>;
  return <span className="font-semibold text-gray-900">{formatIDR(low)} – {formatIDR(high)}</span>;
}

function ProductCard({ product, currentSlug }: { product: RecentProduct; currentSlug?: string }) {
  const isCurrent = product.slug === currentSlug;
  return (
    <a
      href={`/products/${product.slug}`}
      className={`group flex w-36 shrink-0 flex-col overflow-hidden rounded-xl border bg-white transition-all hover:-translate-y-0.5 hover:shadow-md sm:w-44 ${
        isCurrent ? "border-brand-300 ring-1 ring-brand-300" : "border-gray-100"
      }`}
      aria-current={isCurrent ? "page" : undefined}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {product.primaryImage ? (
          <img
            src={product.primaryImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-gray-200">📦</div>
        )}
        {isCurrent && (
          <div className="absolute left-1.5 top-1.5 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
            Sedang dilihat
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <p className="line-clamp-2 text-xs font-medium text-gray-800 leading-snug">{product.name}</p>
        <p className="mt-auto text-xs">
          <PriceLabel low={product.lowestPrice} high={product.highestPrice} />
        </p>
      </div>
    </a>
  );
}

interface Props {
  currentSlug?: string;
  title?: string;
}

export default function RecentlyViewed({ currentSlug, title = "Terakhir Dilihat" }: Props) {
  useEffect(() => {
    hydrateRecentlyViewed();
  }, []);

  const items = useStore($recentlyViewed);

  const visible = currentSlug
    ? items.filter((p) => p.slug !== currentSlug).slice(0, 8)
    : items.slice(0, 8);

  if (visible.length === 0) return null;

  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={() => {
              if (typeof localStorage !== "undefined") {
                localStorage.removeItem("recently_viewed");
              }
              $recentlyViewed.set([]);
            }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Hapus riwayat
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} currentSlug={currentSlug} />
          ))}
        </div>
      </div>
    </section>
  );
}
