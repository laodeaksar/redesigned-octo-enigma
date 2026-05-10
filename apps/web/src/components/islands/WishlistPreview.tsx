// =============================================================================
// WishlistPreview — compact wishlist grid on the profile page using @repo/ui
// Fetches up to 8 items, supports optimistic remove, uses ScrollArea on mobile.
// =============================================================================

import { useEffect, useState } from "react";

import { api, type WishlistItem } from "@/lib/api";
import { formatIDR } from "@/lib/utils";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Skeleton } from "@repo/ui/components/skeleton";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  token: string;
}

// ── Skeleton cards ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2 overflow-hidden rounded-xl border border-border">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-1.5 p-2.5">
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="mt-1 h-3.5 w-2/5" />
      </div>
    </div>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({
  item,
  removing,
  onRemove,
}: {
  item: WishlistItem;
  removing: boolean;
  onRemove: (id: string) => void;
}) {
  const { product } = item;
  const hasRange = product.highestPrice > product.lowestPrice;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-md ${
        removing ? "pointer-events-none opacity-40" : ""
      }`}
    >
      {/* Thumbnail */}
      <a className="block shrink-0" href={`/products/${product.slug}`}>
        {product.primaryImage ? (
          <img
            alt={product.name}
            className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
            src={product.primaryImage}
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-muted">
            <svg
              className="h-8 w-8 text-muted-foreground/25"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.25}
              viewBox="0 0 24 24"
            >
              <path
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </a>

      {/* Badges */}
      {product.totalStock === 0 && (
        <Badge
          className="absolute left-2 top-2 text-[10px]"
          variant="secondary"
        >
          Habis
        </Badge>
      )}

      {/* Remove button — appears on hover */}
      <button
        aria-label="Hapus dari wishlist"
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/85 text-gray-500 opacity-0 shadow-sm backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
        onClick={() => onRemove(product.id)}
        title="Hapus dari wishlist"
        type="button"
      >
        <svg
          className="h-3.5 w-3.5"
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

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <a
          className="line-clamp-2 text-xs font-medium leading-snug text-foreground transition-colors hover:text-primary"
          href={`/products/${product.slug}`}
        >
          {product.name}
        </a>
        <p className="mt-auto pt-1 text-xs font-semibold text-brand-500">
          {formatIDR(product.lowestPrice)}
          {hasRange && (
            <span className="font-normal text-muted-foreground">
              {" – "}
              {formatIDR(product.highestPrice)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const LIMIT = 8;

export default function WishlistPreview({ token }: Props) {
  const [items, setItems]       = useState<WishlistItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get<{
        success: true;
        data: { items: WishlistItem[] };
        meta: { total: number };
      }>("/wishlist", { token, params: { page: 1, limit: LIMIT } })
      .then(res => {
        setItems(res.data.items);
        setTotal(res.meta.total);
      })
      .catch(() => setError("Gagal memuat wishlist."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleRemove = async (productId: string) => {
    // Optimistic: hide immediately
    setRemoving(prev => new Set(prev).add(productId));
    setItems(prev => prev.filter(i => i.product.id !== productId));
    setTotal(prev => Math.max(0, prev - 1));

    try {
      await api.delete(`/wishlist/${productId}`, { token });
    } catch {
      // silently ignore — user is already looking at updated list
    } finally {
      setRemoving(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  return (
    <Card>
      {/* Header */}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Wishlist</CardTitle>
            <CardDescription>
              {loading
                ? "Memuat…"
                : total > 0
                  ? `${total} produk tersimpan`
                  : "Produk favorit kamu"}
            </CardDescription>
          </div>
          {!loading && total > LIMIT && (
            <a
              className="mt-1 shrink-0 text-sm font-medium text-primary hover:underline"
              href="/wishlist"
            >
              Lihat Semua →
            </a>
          )}
        </div>
      </CardHeader>

      {/* Body */}
      <CardContent>
        {/* Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {error}
          </p>
        )}

        {/* Empty */}
        {!loading && !error && items.length === 0 && (
          <Empty className="border border-dashed py-10">
            <EmptyHeader>
              <EmptyMedia>
                <svg
                  className="h-10 w-10 text-muted-foreground/35"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.25}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </EmptyMedia>
              <EmptyTitle>Wishlist masih kosong</EmptyTitle>
              <EmptyDescription>
                Simpan produk favorit kamu untuk dibeli nanti.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <a
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                href="/products"
              >
                Jelajahi Produk
              </a>
            </EmptyContent>
          </Empty>
        )}

        {/* Product grid inside ScrollArea */}
        {!loading && !error && items.length > 0 && (
          <ScrollArea>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map(item => (
                <ProductCard
                  item={item}
                  key={item.id}
                  onRemove={id => void handleRemove(id)}
                  removing={removing.has(item.product.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Footer */}
      {!loading && items.length > 0 && (
        <CardFooter className="justify-between">
          <p className="text-xs text-muted-foreground">
            {items.length < total
              ? `Menampilkan ${items.length} dari ${total} produk`
              : `${total} produk tersimpan`}
          </p>
          <Button asChild size="sm" variant="outline">
            <a href="/wishlist">Kelola Wishlist</a>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
