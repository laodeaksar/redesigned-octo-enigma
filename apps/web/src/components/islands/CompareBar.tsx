import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";
import { formatIDR } from "@/lib/utils";
import {
  $compareCount,
  $compareList,
  $compareOpen,
  clearCompare,
  hydrateCompare,
  MAX_COMPARE,
  removeFromCompare,
} from "@/stores/compare.store";

/*function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}*/

// ── Comparison modal table ────────────────────────────────────────────────────

function CompareModal({ onClose }: { onClose: () => void }) {
  const products = useStore($compareList);

  const allTags = Array.from(new Set(products.flatMap((p) => p.tags)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-gray-100 border-b bg-white px-6 py-4">
          <h2 className="font-bold text-gray-900 text-lg">
            Perbandingan Produk
          </h2>
          <div className="flex items-center gap-3">
            <button
              className="text-gray-400 text-sm hover:text-gray-600"
              onClick={() => {
                clearCompare();
                onClose();
              }}
            >
              Hapus semua
            </button>
            <button
              aria-label="Tutup"
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              onClick={onClose}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="border-gray-100 border-b">
                <td className="w-36 py-4 pl-6 align-top font-semibold text-gray-400 text-xs uppercase tracking-wide" />
                {products.map((p) => (
                  <td
                    className="relative min-w-[180px] px-4 py-4 align-top"
                    key={p.id}
                  >
                    <button
                      aria-label={`Hapus ${p.name}`}
                      className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-gray-300 hover:bg-gray-100 hover:text-gray-600"
                      onClick={() => removeFromCompare(p.id)}
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M6 18L18 6M6 6l12 12"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <a className="group block" href={`/products/${p.slug}`}>
                      <div className="mb-3 aspect-square overflow-hidden rounded-xl bg-gray-50">
                        {p.primaryImage ? (
                          <img
                            alt={p.name}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            src={p.primaryImage}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-4xl text-gray-200">
                            📦
                          </div>
                        )}
                      </div>
                      <p className="line-clamp-2 font-semibold text-gray-900 text-sm group-hover:text-brand-500">
                        {p.name}
                      </p>
                    </a>
                  </td>
                ))}
                {/* Empty slot placeholders */}
                {Array.from({ length: MAX_COMPARE - products.length }).map(
                  (_, i) => (
                    <td
                      className="min-w-[180px] px-4 py-4 align-top"
                      key={`empty-${i}`}
                    >
                      <a
                        className="flex aspect-square items-center justify-center rounded-xl border-2 border-gray-200 border-dashed text-gray-400 transition-colors hover:border-brand-300 hover:text-brand-400"
                        href="/products"
                      >
                        <span className="text-center font-medium text-xs leading-tight">
                          + Tambah
                          <br />
                          produk
                        </span>
                      </a>
                    </td>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {/* Price row */}
              <Row label="Harga">
                {products.map((p) => (
                  <td className="px-4 py-3.5 align-top text-sm" key={p.id}>
                    {p.lowestPrice === p.highestPrice ? (
                      <span className="font-bold text-gray-900">
                        {formatIDR(p.lowestPrice)}
                      </span>
                    ) : (
                      <span className="font-bold text-gray-900">
                        {formatIDR(p.lowestPrice)}
                        <br />
                        <span className="font-normal text-gray-500 text-xs">
                          s/d {formatIDR(p.highestPrice)}
                        </span>
                      </span>
                    )}
                  </td>
                ))}
                {placeholders(products.length)}
              </Row>

              {/* Stock row */}
              <Row label="Stok" shaded>
                {products.map((p) => (
                  <td className="px-4 py-3.5 align-top text-sm" key={p.id}>
                    {p.totalStock === 0 ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-600 text-xs">
                        Habis
                      </span>
                    ) : p.totalStock <= 5 ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 text-xs">
                        Sisa {p.totalStock}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700 text-xs">
                        Tersedia ({p.totalStock})
                      </span>
                    )}
                  </td>
                ))}
                {placeholders(products.length)}
              </Row>

              {/* Category row */}
              {products.some((p) => p.categoryName) && (
                <Row label="Kategori">
                  {products.map((p) => (
                    <td
                      className="px-4 py-3.5 align-top text-gray-700 text-sm"
                      key={p.id}
                    >
                      {p.categoryName ?? (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  ))}
                  {placeholders(products.length)}
                </Row>
              )}

              {/* Tags row */}
              {allTags.length > 0 && (
                <Row label="Tag" shaded>
                  {products.map((p) => (
                    <td className="px-4 py-3.5 align-top" key={p.id}>
                      <div className="flex flex-wrap gap-1">
                        {p.tags.length > 0 ? (
                          p.tags.map((t) => (
                            <span
                              className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 text-xs"
                              key={t}
                            >
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </div>
                    </td>
                  ))}
                  {placeholders(products.length)}
                </Row>
              )}

              {/* CTA row */}
              <tr>
                <td className="py-4 pl-6 font-semibold text-gray-400 text-xs uppercase tracking-wide" />
                {products.map((p) => (
                  <td className="px-4 py-4 align-top" key={p.id}>
                    <a
                      className="block w-full rounded-lg bg-brand-500 px-4 py-2 text-center font-semibold text-sm text-white transition-opacity hover:opacity-90"
                      href={`/products/${p.slug}`}
                    >
                      Lihat Produk
                    </a>
                  </td>
                ))}
                {placeholders(products.length)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
  shaded,
}: {
  label: string;
  children: React.ReactNode;
  shaded?: boolean;
}) {
  return (
    <tr className={shaded ? "bg-gray-50/60" : ""}>
      <td className="py-3.5 pl-6 align-top font-semibold text-gray-400 text-xs uppercase tracking-wide">
        {label}
      </td>
      {children}
    </tr>
  );
}

function placeholders(count: number) {
  return Array.from({ length: MAX_COMPARE - count }).map((_, i) => (
    <td className="px-4 py-3.5 align-top" key={`ph-${i}`} />
  ));
}

// ── Sticky bar ────────────────────────────────────────────────────────────────

export default function CompareBar() {
  const count = useStore($compareCount);
  const products = useStore($compareList);
  const open = useStore($compareOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrateCompare();
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!hydrated || count === 0) {
    return null;
  }

  return (
    <>
      {/* Sticky bar */}
      <div className="fixed right-0 bottom-0 left-0 z-40 border-gray-200 border-t bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          {/* Product thumbnails */}
          <div className="flex flex-1 items-center gap-2 overflow-x-auto">
            {products.map((p) => (
              <div className="relative shrink-0" key={p.id}>
                <div className="h-10 w-10 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {p.primaryImage ? (
                    <img
                      alt={p.name}
                      className="h-full w-full object-cover"
                      src={p.primaryImage}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-base">
                      📦
                    </div>
                  )}
                </div>
                <button
                  aria-label={`Hapus ${p.name}`}
                  className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-700 text-white hover:bg-red-500"
                  onClick={() => removeFromCompare(p.id)}
                >
                  <svg
                    className="h-2.5 w-2.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M6 18L18 6M6 6l12 12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: MAX_COMPARE - count }).map((_, i) => (
              <div
                className="h-10 w-10 shrink-0 rounded-lg border-2 border-gray-200 border-dashed"
                key={`slot-${i}`}
              />
            ))}

            <span className="ml-1 whitespace-nowrap text-gray-500 text-xs">
              {count}/{MAX_COMPARE} produk
            </span>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              className="hidden rounded-lg border border-gray-200 px-3 py-2 font-medium text-gray-600 text-xs hover:bg-gray-50 sm:block"
              onClick={clearCompare}
            >
              Hapus semua
            </button>
            <a
              className="hidden rounded-lg border border-gray-200 px-3 py-2 font-medium text-gray-600 text-xs transition-colors hover:bg-gray-50 sm:block"
              href="/compare"
            >
              Halaman penuh
            </a>
            <button
              className="rounded-lg bg-brand-500 px-4 py-2 font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={count < 2}
              onClick={() => $compareOpen.set(true)}
            >
              Bandingkan {count < 2 ? "(min. 2)" : ""}
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && <CompareModal onClose={() => $compareOpen.set(false)} />}
    </>
  );
}
