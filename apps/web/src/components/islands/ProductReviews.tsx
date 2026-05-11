// =============================================================================
// ProductReviews — React island, client:load
// Shows rating summary + infinite-scroll review list + write-review form.
// =============================================================================

import { useEffect, useState } from "react";
import type React from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/lib/query-client";
import { useProductSummary } from "@/hooks/queries/useProductSummary";
import { useProductReviews, type Review } from "@/hooks/queries/useProductReviews";
import { useOrders } from "@/hooks/queries/useOrders";
import { useSubmitReview } from "@/hooks/mutations/useSubmitReview";
import { notify } from "@/lib/toast";
import { formatRelativeTime } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  isLoggedIn: boolean;
  productId: string;
  productName: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StarDisplay({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
}) {
  const cls =
    size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm";
  return (
    <span aria-label={`${rating} bintang dari 5`} className={cls}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          className={
            n <= Math.round(rating) ? "text-amber-400" : "text-gray-200"
          }
          key={n}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const labels = ["", "Buruk", "Kurang", "Cukup", "Bagus", "Luar biasa"];
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            aria-label={`${n} bintang`}
            className="text-3xl leading-none transition-transform hover:scale-110 focus:outline-none"
            key={n}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            type="button"
          >
            <span
              className={
                n <= (hover || value) ? "text-amber-400" : "text-gray-200"
              }
            >
              ★
            </span>
          </button>
        ))}
        {(hover || value) > 0 && (
          <span className="ml-2 text-sm font-medium text-gray-600">
            {labels[hover || value]}
          </span>
        )}
      </div>
    </div>
  );
}

function RatingBar({
  star,
  count,
  total,
}: {
  star: number;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-4 shrink-0 text-right text-xs text-gray-500">
        {star}
      </span>
      <span className="text-xs text-amber-400">★</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-xs text-gray-400">
        {pct}%
      </span>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const initials = review.userId.slice(0, 2).toUpperCase();
  return (
    <div className="flex gap-3 py-5 first:pt-0">
      <div className="bg-brand-100 text-brand-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StarDisplay rating={review.rating} size="sm" />
          {review.isVerifiedPurchase && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600">
              <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clipRule="evenodd"
                  d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                  fillRule="evenodd"
                />
              </svg>
              Pembelian Terverifikasi
            </span>
          )}
          <span className="text-xs text-gray-400">
            {formatRelativeTime(review.createdAt)}
          </span>
        </div>

        {review.title && (
          <p className="mt-1.5 text-sm font-semibold text-gray-900">
            {review.title}
          </p>
        )}

        {review.body && (
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            {review.body}
          </p>
        )}

        {review.imageUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {review.imageUrls.map((url, i) => (
              <a href={url} key={i} rel="noopener noreferrer" target="_blank">
                <img
                  alt={`Foto ulasan ${i + 1}`}
                  className="h-16 w-16 rounded-lg border border-gray-100 object-cover transition-opacity hover:opacity-90"
                  src={url}
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function ProductReviewsInner({ productId, productName, isLoggedIn }: Props) {
  // Write form state
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [orderId, setOrderId] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: summary, isPending: summaryLoading } =
    useProductSummary(productId);

  const {
    data: reviewPages,
    isPending: reviewsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProductReviews(productId);

  const { data: ordersData, isPending: ordersLoading } = useOrders({
    enabled: showForm && isLoggedIn,
    params: { limit: 30 },
  });

  const orders = ordersData?.items ?? [];

  // ── Mutation ─────────────────────────────────────────────────────────────────

  const submitMutation = useSubmitReview(productId);

  // Auto-select first order when list loads
  useEffect(() => {
    if (orders.length > 0 && !orderId) {
      setOrderId(orders[0].id);
    }
  }, [orders, orderId]);

  const loading = summaryLoading || reviewsLoading;
  // Flatten all infinite-query pages into a single list
  const reviews = reviewPages?.pages.flatMap(p => p.data) ?? [];

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      notify.error("Pilih rating bintang terlebih dahulu.");
      return;
    }
    if (!orderId.trim()) {
      notify.error("Pilih atau masukkan ID pesanan.");
      return;
    }
    submitMutation.mutate(
      {
        orderId: orderId.trim(),
        rating,
        title: title.trim() || null,
        body: body.trim() || null,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setRating(0);
          setTitle("");
          setBody("");
          setOrderId("");
        },
      }
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="py-14">
      <div className="container mx-auto px-4">
        <h2 className="mb-8 text-xl font-bold text-gray-900">Ulasan Pembeli</h2>

        {loading && (
          <div className="flex h-32 items-center justify-center">
            <div className="border-brand-500 h-7 w-7 animate-spin rounded-full border-4 border-t-transparent" />
          </div>
        )}

        {!loading && (
          <div className="grid gap-10 lg:grid-cols-3">
            {/* ── Left: summary + write button ─────────────────────────── */}
            <div className="lg:col-span-1">
              {summary && summary.count > 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-end gap-3">
                    <span className="text-5xl leading-none font-extrabold text-gray-900">
                      {summary.average.toFixed(1)}
                    </span>
                    <div>
                      <StarDisplay rating={summary.average} size="lg" />
                      <p className="mt-0.5 text-xs text-gray-500">
                        {summary.count} ulasan
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map(star => (
                      <RatingBar
                        count={summary.breakdown[String(star)] ?? 0}
                        key={star}
                        star={star}
                        total={summary.count}
                      />
                    ))}
                  </div>
                </div>
              ) : summary?.count === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                  <p className="text-3xl">⭐</p>
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    Belum ada ulasan
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Jadilah yang pertama memberi ulasan!
                  </p>
                </div>
              ) : null}

              {/* Write review button */}
              <div className="mt-4">
                {isLoggedIn ? (
                  submitMutation.isSuccess ? (
                    <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                      ✓ Ulasanmu berhasil dikirim. Terima kasih!
                    </div>
                  ) : (
                    <button
                      className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                        showForm
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          : "bg-brand-500 hover:bg-brand-600 text-white"
                      }`}
                      onClick={() => setShowForm(v => !v)}
                    >
                      {showForm ? "Batal" : "Tulis Ulasan"}
                    </button>
                  )
                ) : (
                  <a
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-gray-600 hover:bg-gray-50"
                    href={`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                  >
                    Login untuk menulis ulasan
                  </a>
                )}
              </div>

              {/* Write-review form */}
              {showForm && isLoggedIn && (
                <form
                  className="mt-4 space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                  onSubmit={handleSubmit}
                >
                  <h3 className="text-sm font-semibold text-gray-900">
                    Beri Ulasanmu
                  </h3>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">
                      Rating <span className="text-red-500">*</span>
                    </label>
                    <StarPicker onChange={setRating} value={rating} />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">
                      Pesanan <span className="text-red-500">*</span>
                    </label>
                    {ordersLoading ? (
                      <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs text-gray-400">
                        <div className="border-t-brand-500 h-3 w-3 animate-spin rounded-full border-2 border-gray-300" />
                        Memuat pesanan…
                      </div>
                    ) : orders.length > 0 ? (
                      <select
                        className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:ring-1 focus:outline-none"
                        onChange={e => setOrderId(e.target.value)}
                        value={orderId}
                      >
                        {orders.map(o => (
                          <option key={o.id} value={o.id}>
                            #{o.orderNumber} —{" "}
                            {new Date(o.createdAt).toLocaleDateString("id-ID")}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-300 focus:ring-1 focus:outline-none"
                        onChange={e => setOrderId(e.target.value)}
                        placeholder="Masukkan ID pesanan"
                        type="text"
                        value={orderId}
                      />
                    )}
                    <p className="mt-1 text-[10px] text-gray-400">
                      Ulasan hanya untuk produk yang sudah dibeli.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">
                      Judul <span className="text-gray-400">(opsional)</span>
                    </label>
                    <input
                      className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-300 focus:ring-1 focus:outline-none"
                      maxLength={150}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Ringkas pendapatmu…"
                      type="text"
                      value={title}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">
                      Ulasan <span className="text-gray-400">(opsional)</span>
                    </label>
                    <textarea
                      className="focus:border-brand-500 focus:ring-brand-500 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-300 focus:ring-1 focus:outline-none"
                      maxLength={2000}
                      onChange={e => setBody(e.target.value)}
                      placeholder={`Bagikan pengalamanmu dengan ${productName}…`}
                      rows={4}
                      value={body}
                    />
                    <p className="mt-0.5 text-right text-[10px] text-gray-400">
                      {body.length}/2000
                    </p>
                  </div>

                  {submitMutation.isError && (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                      {submitMutation.error instanceof Error
                        ? submitMutation.error.message
                        : "Gagal mengirim ulasan."}
                    </div>
                  )}

                  <button
                    className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-all ${
                      rating === 0 || submitMutation.isPending
                        ? "cursor-not-allowed bg-gray-100 text-gray-400"
                        : "bg-accent text-white hover:opacity-90 active:scale-[0.98]"
                    }`}
                    disabled={submitMutation.isPending || rating === 0}
                    type="submit"
                  >
                    {submitMutation.isPending ? "Mengirim…" : "Kirim Ulasan"}
                  </button>
                </form>
              )}
            </div>

            {/* ── Right: reviews list ──────────────────────────────────── */}
            <div className="lg:col-span-2">
              {reviews.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-gray-400">
                  <span className="text-4xl">💬</span>
                  <p className="text-sm">Belum ada ulasan untuk produk ini.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {reviews.map(review => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              )}

              {hasNextPage && (
                <button
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  disabled={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchingNextPage ? (
                    <>
                      <div className="border-t-brand-500 h-4 w-4 animate-spin rounded-full border-2 border-gray-300" />
                      Memuat…
                    </>
                  ) : (
                    "Muat Lebih Banyak Ulasan"
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function ProductReviews(props: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <ProductReviewsInner {...props} />
    </QueryClientProvider>
  );
}
