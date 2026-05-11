// =============================================================================
// ProductQuickView — React island, client:load
// Opens as a bottom sheet on mobile, centred modal on desktop.
// Triggered by: window.dispatchEvent(new CustomEvent("open-quick-view", { detail: { slug } }))
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { useQuery, QueryClientProvider } from "@tanstack/react-query";
import { addToCart } from "@/stores/cart.store";

import { queryClient } from "@/lib/query-client";
import type { ProductDetail } from "@/lib/api";
import { formatIDR } from "@/lib/utils";

const BASE = import.meta.env.PUBLIC_API_URL ?? "http://localhost:3000";

async function fetchProductDetail(slug: string): Promise<ProductDetail> {
  const r = await fetch(`${BASE}/products/slug/${slug}`);
  if (!r.ok) throw new Error("Gagal memuat produk.");
  const body = (await r.json()) as { data: ProductDetail };
  return body.data;
}

function ProductQuickViewInner() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [imageIdx, setImageIdx] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // ── Listen for trigger ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { slug: s } = (e as CustomEvent<{ slug: string }>).detail;
      setSlug(s);
      setImageIdx(0);
      setQty(1);
      setAdded(false);
      setMounted(true);
      // Small delay so the mount transition renders before open
      requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
    };
    window.addEventListener("open-quick-view", handler);
    return () => window.removeEventListener("open-quick-view", handler);
  }, []);

  // ── Fetch product detail via TanStack Query ──────────────────────────────────
  const { data: product, isPending: loading, isError } = useQuery({
    queryKey: ["product-detail", slug],
    queryFn: () => fetchProductDetail(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  // Reset selected variant + image when product loads
  useEffect(() => {
    if (!product) return;
    const first = product.variants.find(v => v.isActive);
    if (first) setSelected({ ...first.attributes });
    const primaryIdx = product.images.findIndex(i => i.isPrimary);
    setImageIdx(primaryIdx >= 0 ? primaryIdx : 0);
  }, [product]);

  // ── Close helpers ────────────────────────────────────────────────────────────
  const close = useCallback(() => {
    setOpen(false);
    setTimeout(() => {
      setMounted(false);
      setSlug(null);
    }, 320);
  }, []);

  // Lock body scroll + Escape key while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // ── Variant logic ────────────────────────────────────────────────────────────
  const activeVariants = product?.variants.filter(v => v.isActive) ?? [];
  const attrKeys = Object.keys(activeVariants[0]?.attributes ?? {});
  const attrValues = (key: string) => [
    ...new Set(
      activeVariants.map(v => v.attributes[key]).filter(Boolean) as string[]
    ),
  ];
  const matchedVariant =
    activeVariants.find(v =>
      attrKeys.every(k => v.attributes[k] === selected[k])
    ) ??
    activeVariants[0] ??
    null;
  const isOutOfStock = !matchedVariant || matchedVariant.stock === 0;
  const maxQty = matchedVariant?.stock ?? 1;

  const handleAdd = () => {
    if (!matchedVariant || isOutOfStock || !product) return;
    const coverImage =
      product.images.find(i => i.isPrimary)?.url ??
      product.images[0]?.url ??
      null;
    addToCart({
      variantId: matchedVariant.id,
      productName: product.name,
      variantName: matchedVariant.name,
      sku: matchedVariant.id,
      imageUrl: coverImage,
      price: matchedVariant.price,
      quantity: qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (!mounted) return null;

  const discountPct =
    matchedVariant?.compareAtPrice &&
    matchedVariant.compareAtPrice > matchedVariant.price
      ? Math.round(
          (1 - matchedVariant.price / matchedVariant.compareAtPrice) * 100
        )
      : 0;

  const error = isError ? "Gagal memuat produk." : null;

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={close}
      />

      {/* ── Modal / sheet ────────────────────────────────────────────────────── */}
      <div
        aria-label={product?.name ?? "Quick view"}
        aria-modal="true"
        className={`fixed inset-x-0 bottom-0 z-[90] flex flex-col transition-all duration-300 sm:inset-0 sm:items-center sm:justify-center sm:p-4 ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={e => e.stopPropagation()}
        role="dialog"
      >
        <div
          className={`relative w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 sm:max-w-3xl sm:rounded-2xl ${
            open
              ? "translate-y-0 sm:scale-100"
              : "translate-y-full sm:translate-y-0 sm:scale-95"
          }`}
          style={{ maxHeight: "92dvh" }}
        >
          {/* Close */}
          <button
            aria-label="Tutup"
            className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow ring-1 ring-gray-100 hover:bg-gray-100 hover:text-gray-700"
            onClick={close}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                d="M6 18 18 6M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-gray-200" />
          </div>

          <div
            className="overflow-y-auto"
            style={{ maxHeight: "calc(92dvh - 1rem)" }}
          >
            {/* Loading */}
            {loading && (
              <div className="flex h-64 items-center justify-center">
                <div className="border-brand-500 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="flex h-40 flex-col items-center justify-center gap-3 p-6">
                <p className="text-sm text-gray-500">{error}</p>
                <button
                  className="text-accent text-sm hover:underline"
                  onClick={close}
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Content */}
            {product && !loading && (
              <div className="flex flex-col sm:flex-row">
                {/* Left — image gallery */}
                <div className="w-full shrink-0 bg-gray-50 sm:w-2/5">
                  <div className="aspect-square overflow-hidden">
                    {product.images.length > 0 ? (
                      <img
                        alt={product.images[imageIdx]?.altText ?? product.name}
                        className="h-full w-full object-cover transition-opacity duration-200"
                        key={imageIdx}
                        src={
                          product.images[imageIdx]?.url ?? product.images[0].url
                        }
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-6xl text-gray-200">
                        📦
                      </div>
                    )}
                  </div>
                  {product.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto p-3">
                      {product.images.map((img, i) => (
                        <button
                          className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                            imageIdx === i
                              ? "border-brand-500"
                              : "border-transparent hover:border-gray-300"
                          }`}
                          key={img.id}
                          onClick={() => setImageIdx(i)}
                        >
                          <img
                            alt={img.altText ?? ""}
                            className="h-full w-full object-cover"
                            src={img.url}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right — details */}
                <div className="flex flex-1 flex-col gap-4 p-5">
                  {/* Name + short desc */}
                  <div>
                    <h2 className="text-lg leading-snug font-bold text-gray-900">
                      {product.name}
                    </h2>
                    {product.shortDescription && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {product.shortDescription}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {matchedVariant ? formatIDR(matchedVariant.price) : "—"}
                    </span>
                    {matchedVariant?.compareAtPrice && (
                      <span className="text-base text-gray-400 line-through">
                        {formatIDR(matchedVariant.compareAtPrice)}
                      </span>
                    )}
                    {discountPct > 0 && (
                      <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                        -{discountPct}%
                      </span>
                    )}
                  </div>

                  {/* Variant selectors */}
                  {attrKeys.map(key => (
                    <div key={key}>
                      <p className="mb-2 text-sm font-medium text-gray-700 capitalize">
                        {key}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {attrValues(key).map(val => {
                          const available = activeVariants.some(
                            v => v.attributes[key] === val && v.stock > 0
                          );
                          return (
                            <button
                              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                                selected[key] === val
                                  ? "border-brand-500 bg-brand-500 text-white"
                                  : available
                                    ? "border-gray-200 text-gray-700 hover:border-gray-400"
                                    : "cursor-not-allowed border-gray-100 text-gray-300 line-through"
                              }`}
                              disabled={!available}
                              key={val}
                              onClick={() =>
                                setSelected(s => ({ ...s, [key]: val }))
                              }
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Low stock warning */}
                  {matchedVariant &&
                    matchedVariant.stock > 0 &&
                    matchedVariant.stock <= 5 && (
                      <p className="text-sm font-medium text-yellow-600">
                        ⚡ Sisa {matchedVariant.stock} item
                      </p>
                    )}

                  {/* Quantity */}
                  {!isOutOfStock && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">Jumlah:</span>
                      <div className="flex items-center rounded-md border border-gray-200">
                        <button
                          className="flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-50"
                          onClick={() => setQty(q => Math.max(1, q - 1))}
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-sm font-medium">
                          {qty}
                        </span>
                        <button
                          className="flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-50"
                          onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-auto flex flex-col gap-2 pt-2">
                    <button
                      className={`w-full rounded-lg py-3 text-sm font-semibold transition-all ${
                        isOutOfStock
                          ? "cursor-not-allowed bg-gray-100 text-gray-400"
                          : added
                            ? "bg-green-500 text-white"
                            : "bg-accent text-white hover:opacity-90 active:scale-[0.98]"
                      }`}
                      disabled={isOutOfStock}
                      onClick={handleAdd}
                    >
                      {isOutOfStock
                        ? "Stok Habis"
                        : added
                          ? "✓ Ditambahkan!"
                          : "Tambah ke Keranjang"}
                    </button>
                    <a
                      className="block w-full rounded-lg border border-gray-200 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                      href={`/products/${product.slug}`}
                      onClick={close}
                    >
                      Lihat Detail Lengkap →
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function ProductQuickView() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProductQuickViewInner />
    </QueryClientProvider>
  );
}
