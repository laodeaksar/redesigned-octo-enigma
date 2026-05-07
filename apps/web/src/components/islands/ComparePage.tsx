// =============================================================================
// ComparePage — React island for /compare
// Fetches full product details, renders side-by-side comparison table.
// =============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { useStore } from "@nanostores/react";
import {
  $compareList,
  hydrateCompare,
  removeFromCompare,
  clearCompare,
  MAX_COMPARE,
} from "@/stores/compare.store";
import { formatIDR } from "@/lib/utils";
import type { ProductDetail } from "@/lib/api";

const BASE = import.meta.env.PUBLIC_API_URL ?? "http://localhost:3000";

async function fetchDetail(slug: string): Promise<ProductDetail | null> {
  try {
    const r = await fetch(`${BASE}/products/slug/${slug}`);
    const body = (await r.json()) as { data: ProductDetail };
    return body.data;
  } catch {
    return null;
  }
}

function openQuickView(slug: string) {
  window.dispatchEvent(new CustomEvent("open-quick-view", { detail: { slug } }));
}

// ── Row helper ────────────────────────────────────────────────────────────────

function Row({
  label,
  shaded,
  children,
}: {
  label: string;
  shaded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <tr className={shaded ? "bg-gray-50/70" : "bg-white"}>
      <td className="sticky left-0 z-10 w-36 shrink-0 border-r border-gray-100 py-4 pl-4 pr-3 align-top text-xs font-semibold uppercase tracking-wide text-gray-400 sm:w-44 sm:pl-6"
        style={{ backgroundColor: "inherit" }}>
        {label}
      </td>
      {children}
    </tr>
  );
}

function EmptySlot() {
  return (
    <td className="px-4 py-4 align-top">
      <a
        href="/products"
        className="flex aspect-square max-h-32 max-w-[8rem] items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-400 transition-colors hover:border-brand-300 hover:text-brand-400"
      >
        <span className="text-center text-xs font-medium leading-tight">
          + Tambah<br />produk
        </span>
      </a>
    </td>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ComparePage() {
  const products = useStore($compareList);
  const [details, setDetails] = useState<(ProductDetail | null)[]>([]);
  const [loading, setLoading] = useState(true);

  // Hydrate store once on mount
  useEffect(() => {
    hydrateCompare();
  }, []);

  // Re-fetch whenever product list changes
  const slugKey = products.map((p) => p.slug).join(",");
  useEffect(() => {
    if (products.length === 0) {
      setDetails([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(products.map((p) => fetchDetail(p.slug))).then((results) => {
      setDetails(results);
      setLoading(false);
    });
  }, [slugKey]);

  // ── Empty / loading states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-gray-200 py-28 text-center">
        <span className="text-6xl">⚖️</span>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Belum ada produk</h2>
          <p className="mt-1 text-sm text-gray-500">
            Pilih produk dari halaman produk dan klik tombol "Bandingkan".
          </p>
        </div>
        <a
          href="/products"
          className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Jelajahi Produk
        </a>
      </div>
    );
  }

  if (products.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-gray-200 py-28 text-center">
        <span className="text-5xl">➕</span>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tambahkan 1 produk lagi</h2>
          <p className="mt-1 text-sm text-gray-500">
            Kamu butuh minimal 2 produk untuk mulai membandingkan.
          </p>
        </div>
        <a
          href="/products"
          className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Tambah Produk
        </a>
      </div>
    );
  }

  // ── Compute highlights ─────────────────────────────────────────────────────

  const emptySlots = MAX_COMPARE - products.length;
  const prices = products.map((p) => p.lowestPrice);
  const lowestPriceIdx = prices.indexOf(Math.min(...prices));
  const allTags = Array.from(new Set(products.flatMap((p) => p.tags)));

  // ── Comparison table ───────────────────────────────────────────────────────

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {products.length} produk dipilih
        </p>
        <button
          onClick={clearCompare}
          className="text-sm text-gray-400 transition-colors hover:text-red-500"
        >
          Hapus semua
        </button>
      </div>

      {/* Scrollable table wrapper */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full min-w-[560px] border-collapse">

          {/* ── Product header row ─────────────────────────────────────────── */}
          <thead>
            <tr className="border-b border-gray-100">
              {/* Sticky label cell */}
              <td className="sticky left-0 z-20 w-36 border-r border-gray-100 bg-white py-4 pl-4 pr-3 sm:w-44 sm:pl-6" />

              {products.map((p, i) => {
                const detail = details[i];
                const primaryImg =
                  detail?.images.find((img) => img.isPrimary)?.url ??
                  detail?.images[0]?.url ??
                  p.primaryImage;

                return (
                  <td key={p.id} className="relative min-w-[200px] px-4 py-5 align-top sm:min-w-[220px]">
                    {/* Remove button */}
                    <button
                      onClick={() => removeFromCompare(p.id)}
                      className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      aria-label={`Hapus ${p.name}`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>

                    {/* Product image */}
                    <a href={`/products/${p.slug}`} className="group block">
                      <div className="mb-3 aspect-square overflow-hidden rounded-xl bg-gray-50">
                        {primaryImg ? (
                          <img
                            src={primaryImg}
                            alt={p.name}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-5xl text-gray-200">📦</div>
                        )}
                      </div>
                      <p className="line-clamp-2 text-sm font-semibold text-gray-900 transition-colors group-hover:text-brand-500">
                        {p.name}
                      </p>
                      {p.categoryName && (
                        <p className="mt-0.5 text-xs text-gray-400">{p.categoryName}</p>
                      )}
                    </a>
                  </td>
                );
              })}

              {/* Empty slots */}
              {Array.from({ length: emptySlots }).map((_, i) => (
                <td key={`empty-head-${i}`} className="min-w-[160px] px-4 py-5 align-top sm:min-w-[180px]">
                  <a
                    href="/products"
                    className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-400 transition-colors hover:border-brand-300 hover:text-brand-400"
                  >
                    <span className="text-center text-xs font-medium leading-snug">
                      + Tambah<br />produk
                    </span>
                  </a>
                </td>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* ── Price ─────────────────────────────────────────────────── */}
            <Row label="Harga">
              {products.map((p, i) => (
                <td key={p.id} className="px-4 py-4 align-top text-sm">
                  <div className={`font-bold ${i === lowestPriceIdx ? "text-green-600" : "text-gray-900"}`}>
                    {p.lowestPrice === p.highestPrice
                      ? formatIDR(p.lowestPrice)
                      : `${formatIDR(p.lowestPrice)} – ${formatIDR(p.highestPrice)}`}
                  </div>
                  {i === lowestPriceIdx && products.length >= 2 && (
                    <span className="mt-1 inline-block rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600">
                      Termurah
                    </span>
                  )}
                </td>
              ))}
              {Array.from({ length: emptySlots }).map((_, i) => (
                <td key={`ph-price-${i}`} className="px-4 py-4" />
              ))}
            </Row>

            {/* ── Stock ─────────────────────────────────────────────────── */}
            <Row label="Stok" shaded>
              {products.map((p) => (
                <td key={p.id} className="px-4 py-4 align-top">
                  {p.totalStock === 0 ? (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                      Habis
                    </span>
                  ) : p.totalStock <= 5 ? (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      ⚡ Sisa {p.totalStock}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                      ✓ Tersedia ({p.totalStock})
                    </span>
                  )}
                </td>
              ))}
              {Array.from({ length: emptySlots }).map((_, i) => (
                <td key={`ph-stock-${i}`} className="px-4 py-4" />
              ))}
            </Row>

            {/* ── Category ──────────────────────────────────────────────── */}
            {products.some((p) => p.categoryName) && (
              <Row label="Kategori">
                {products.map((p) => (
                  <td key={p.id} className="px-4 py-4 align-top text-sm text-gray-700">
                    {p.categoryName ?? <span className="text-gray-300">—</span>}
                  </td>
                ))}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <td key={`ph-cat-${i}`} className="px-4 py-4" />
                ))}
              </Row>
            )}

            {/* ── Short description ─────────────────────────────────────── */}
            {details.some((d) => d?.shortDescription) && (
              <Row label="Deskripsi" shaded>
                {products.map((_, i) => {
                  const d = details[i];
                  return (
                    <td key={products[i].id} className="px-4 py-4 align-top text-sm leading-relaxed text-gray-600">
                      {d?.shortDescription ?? <span className="text-gray-300">—</span>}
                    </td>
                  );
                })}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <td key={`ph-desc-${i}`} className="px-4 py-4" />
                ))}
              </Row>
            )}

            {/* ── Variants ──────────────────────────────────────────────── */}
            {details.some((d) => d && d.variants.length > 0) && (
              <Row label="Varian">
                {products.map((_, i) => {
                  const d = details[i];
                  const active = d?.variants.filter((v) => v.isActive) ?? [];
                  const attrKeys = Object.keys(active[0]?.attributes ?? {});
                  return (
                    <td key={products[i].id} className="px-4 py-4 align-top text-sm text-gray-700">
                      {active.length > 0 ? (
                        <div className="space-y-1">
                          <p className="font-medium">{active.length} varian</p>
                          {attrKeys.map((key) => {
                            const vals = [...new Set(active.map((v) => v.attributes[key]).filter(Boolean))];
                            return (
                              <p key={key} className="text-xs text-gray-500 capitalize">
                                {key}: {vals.join(", ")}
                              </p>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <td key={`ph-var-${i}`} className="px-4 py-4" />
                ))}
              </Row>
            )}

            {/* ── Weight ────────────────────────────────────────────────── */}
            {details.some((d) => d?.weight) && (
              <Row label="Berat" shaded>
                {products.map((_, i) => {
                  const d = details[i];
                  return (
                    <td key={products[i].id} className="px-4 py-4 align-top text-sm text-gray-700">
                      {d?.weight ? `${d.weight}g` : <span className="text-gray-300">—</span>}
                    </td>
                  );
                })}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <td key={`ph-wt-${i}`} className="px-4 py-4" />
                ))}
              </Row>
            )}

            {/* ── Tags ──────────────────────────────────────────────────── */}
            {allTags.length > 0 && (
              <Row label="Tag">
                {products.map((p) => (
                  <td key={p.id} className="px-4 py-4 align-top">
                    {p.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.tags.map((t) => (
                          <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-300">—</span>
                    )}
                  </td>
                ))}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <td key={`ph-tags-${i}`} className="px-4 py-4" />
                ))}
              </Row>
            )}

            {/* ── CTA row ───────────────────────────────────────────────── */}
            <tr className="border-t border-gray-100">
              <td className="sticky left-0 z-10 border-r border-gray-100 bg-white py-4 pl-4 pr-3 sm:pl-6" />
              {products.map((p) => (
                <td key={p.id} className="px-4 py-4 align-top">
                  <div className="flex flex-col gap-2">
                    {p.totalStock > 0 && (
                      <button
                        onClick={() => openQuickView(p.slug)}
                        className="block w-full rounded-lg bg-accent px-4 py-2 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Tambah ke Keranjang
                      </button>
                    )}
                    <a
                      href={`/products/${p.slug}`}
                      className="block w-full rounded-lg border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Lihat Detail →
                    </a>
                  </div>
                </td>
              ))}
              {Array.from({ length: emptySlots }).map((_, i) => (
                <td key={`ph-cta-${i}`} className="px-4 py-4" />
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile hint */}
      <p className="mt-3 text-center text-xs text-gray-400 sm:hidden">
        Geser ke kanan untuk melihat semua produk →
      </p>
    </div>
  );
}
