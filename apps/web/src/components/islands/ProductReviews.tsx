// =============================================================================
// ProductReviews — React island, client:load
// Shows rating summary + paginated review list + write-review form.
// =============================================================================

import React, { useState, useEffect } from "react";
import { formatRelativeTime } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string | null;
  imageUrls: string[];
  isVerifiedPurchase: boolean;
  createdAt: string;
}

interface RatingSummary {
  average: number;
  count: number;
  breakdown: Record<string, number>;
}

interface UserOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
}

interface Props {
  productId: string;
  productName: string;
  isLoggedIn: boolean;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm";
  return (
    <span className={cls} aria-label={`${rating} bintang dari 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(rating) ? "text-amber-400" : "text-gray-200"}>
          ★
        </span>
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const labels = ["", "Buruk", "Kurang", "Cukup", "Bagus", "Luar biasa"];
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="text-3xl leading-none transition-transform hover:scale-110 focus:outline-none"
            aria-label={`${n} bintang`}
          >
            <span className={n <= (hover || value) ? "text-amber-400" : "text-gray-200"}>★</span>
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

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-4 shrink-0 text-right text-xs text-gray-500">{star}</span>
      <span className="text-amber-400 text-xs">★</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-xs text-gray-400">{pct}%</span>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const initials = review.userId.slice(0, 2).toUpperCase();
  return (
    <div className="flex gap-3 py-5 first:pt-0">
      {/* Avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-2">
          <StarDisplay rating={review.rating} size="sm" />
          {review.isVerifiedPurchase && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600">
              <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              Pembelian Terverifikasi
            </span>
          )}
          <span className="text-xs text-gray-400">{formatRelativeTime(review.createdAt)}</span>
        </div>

        {/* Title */}
        {review.title && (
          <p className="mt-1.5 text-sm font-semibold text-gray-900">{review.title}</p>
        )}

        {/* Body */}
        {review.body && (
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{review.body}</p>
        )}

        {/* Images */}
        {review.imageUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {review.imageUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt={`Foto ulasan ${i + 1}`}
                  className="h-16 w-16 rounded-lg object-cover border border-gray-100 hover:opacity-90 transition-opacity"
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

export default function ProductReviews({ productId, productName, isLoggedIn }: Props) {
  const [summary, setSummary]         = useState<RatingSummary | null>(null);
  const [reviews, setReviews]         = useState<Review[]>([]);
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Write form state
  const [showForm, setShowForm]         = useState(false);
  const [rating, setRating]             = useState(0);
  const [title, setTitle]               = useState("");
  const [body, setBody]                 = useState("");
  const [orderId, setOrderId]           = useState("");
  const [orders, setOrders]             = useState<UserOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ── Fetch summary + first page ──────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch(`/api/products/${productId}/summary`).then((r) => r.json()),
      fetch(`/api/products/${productId}/reviews?page=1&limit=10`).then((r) => r.json()),
    ])
      .then(([s, r]) => {
        if (s?.data) setSummary(s.data as RatingSummary);
        setReviews((r?.data as Review[]) ?? []);
        setHasMore(r?.meta?.hasNextPage ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  // ── Fetch user's orders when form opens ────────────────────────────────────

  useEffect(() => {
    if (!showForm || !isLoggedIn || orders.length > 0) return;
    setOrdersLoading(true);
    fetch("/api/orders?limit=30")
      .then((r) => r.json())
      .then((d) => {
        const list = (d?.data as UserOrder[]) ?? [];
        setOrders(list);
        if (list.length > 0) setOrderId(list[0].id);
      })
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [showForm, isLoggedIn]);

  // ── Load more reviews ───────────────────────────────────────────────────────

  const loadMore = async () => {
    setLoadingMore(true);
    const next = page + 1;
    try {
      const r = await fetch(`/api/products/${productId}/reviews?page=${next}&limit=10`);
      const d = await r.json();
      setReviews((prev) => [...prev, ...((d?.data as Review[]) ?? [])]);
      setHasMore(d?.meta?.hasNextPage ?? false);
      setPage(next);
    } catch {
      // silently ignore
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Submit review ───────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setSubmitError("Pilih rating bintang terlebih dahulu."); return; }
    if (!orderId.trim()) { setSubmitError("Pilih atau masukkan ID pesanan."); return; }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId.trim(),
          rating,
          title: title.trim() || null,
          body: body.trim() || null,
        }),
      });

      const data = (await res.json()) as { success?: boolean; error?: { message?: string } };

      if (res.ok && data.success) {
        setSubmitSuccess(true);
        setShowForm(false);
        setRating(0); setTitle(""); setBody(""); setOrderId("");

        // Refresh list + summary
        const [s, r] = await Promise.all([
          fetch(`/api/products/${productId}/summary`).then((x) => x.json()),
          fetch(`/api/products/${productId}/reviews?page=1&limit=10`).then((x) => x.json()),
        ]);
        if (s?.data) setSummary(s.data as RatingSummary);
        setReviews((r?.data as Review[]) ?? []);
        setHasMore(r?.meta?.hasNextPage ?? false);
        setPage(1);
      } else {
        setSubmitError(data.error?.message ?? "Gagal mengirim ulasan. Pastikan kamu sudah membeli produk ini.");
      }
    } catch {
      setSubmitError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="py-14">
      <div className="container mx-auto px-4">
        <h2 className="mb-8 text-xl font-bold text-gray-900">Ulasan Pembeli</h2>

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex h-32 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        )}

        {!loading && (
          <div className="grid gap-10 lg:grid-cols-3">

            {/* ── Left: summary + write button ─────────────────────────── */}
            <div className="lg:col-span-1">
              {summary && summary.count > 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  {/* Average */}
                  <div className="mb-4 flex items-end gap-3">
                    <span className="text-5xl font-extrabold text-gray-900 leading-none">
                      {summary.average.toFixed(1)}
                    </span>
                    <div>
                      <StarDisplay rating={summary.average} size="lg" />
                      <p className="mt-0.5 text-xs text-gray-500">{summary.count} ulasan</p>
                    </div>
                  </div>

                  {/* Breakdown bars */}
                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <RatingBar
                        key={star}
                        star={star}
                        count={summary.breakdown[star] ?? 0}
                        total={summary.count}
                      />
                    ))}
                  </div>
                </div>
              ) : !loading && summary?.count === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                  <p className="text-3xl">⭐</p>
                  <p className="mt-2 text-sm font-medium text-gray-700">Belum ada ulasan</p>
                  <p className="mt-1 text-xs text-gray-400">Jadilah yang pertama memberi ulasan!</p>
                </div>
              ) : null}

              {/* Write review button */}
              <div className="mt-4">
                {isLoggedIn ? (
                  submitSuccess ? (
                    <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                      ✓ Ulasanmu berhasil dikirim. Terima kasih!
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowForm((v) => !v)}
                      className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                        showForm
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          : "bg-brand-500 text-white hover:bg-brand-600"
                      }`}
                    >
                      {showForm ? "Batal" : "Tulis Ulasan"}
                    </button>
                  )
                ) : (
                  <a
                    href={`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Login untuk menulis ulasan
                  </a>
                )}
              </div>

              {/* ── Write-review form ──────────────────────────────────── */}
              {showForm && isLoggedIn && (
                <form
                  onSubmit={(e) => void handleSubmit(e)}
                  className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4"
                >
                  <h3 className="text-sm font-semibold text-gray-900">Beri Ulasanmu</h3>

                  {/* Star picker */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">
                      Rating <span className="text-red-500">*</span>
                    </label>
                    <StarPicker value={rating} onChange={setRating} />
                  </div>

                  {/* Order selector */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">
                      Pesanan <span className="text-red-500">*</span>
                    </label>
                    {ordersLoading ? (
                      <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs text-gray-400">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
                        Memuat pesanan…
                      </div>
                    ) : orders.length > 0 ? (
                      <select
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        {orders.map((o) => (
                          <option key={o.id} value={o.id}>
                            #{o.orderNumber} — {new Date(o.createdAt).toLocaleDateString("id-ID")}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        placeholder="Masukkan ID pesanan"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    )}
                    <p className="mt-1 text-[10px] text-gray-400">
                      Ulasan hanya untuk produk yang sudah dibeli.
                    </p>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">
                      Judul <span className="text-gray-400">(opsional)</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={150}
                      placeholder="Ringkas pendapatmu…"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">
                      Ulasan <span className="text-gray-400">(opsional)</span>
                    </label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      maxLength={2000}
                      rows={4}
                      placeholder={`Bagikan pengalamanmu dengan ${productName}…`}
                      className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <p className="mt-0.5 text-right text-[10px] text-gray-400">
                      {body.length}/2000
                    </p>
                  </div>

                  {/* Error */}
                  {submitError && (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                      {submitError}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting || rating === 0}
                    className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-all ${
                      rating === 0 || submitting
                        ? "cursor-not-allowed bg-gray-100 text-gray-400"
                        : "bg-accent text-white hover:opacity-90 active:scale-[0.98]"
                    }`}
                  >
                    {submitting ? "Mengirim…" : "Kirim Ulasan"}
                  </button>
                </form>
              )}
            </div>

            {/* ── Right: reviews list ──────────────────────────────────── */}
            <div className="lg:col-span-2">
              {reviews.length === 0 && !loading ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-gray-400">
                  <span className="text-4xl">💬</span>
                  <p className="text-sm">Belum ada ulasan untuk produk ini.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              )}

              {/* Load more */}
              {hasMore && (
                <button
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
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
