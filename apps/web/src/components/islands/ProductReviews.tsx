// =============================================================================
// ProductReviews — React island, client:load
// Shows rating summary + infinite-scroll review list + write-review form.
//
// Review form uses @tanstack/react-form (v1.x) and @repo/ui components.
// =============================================================================

import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";

import { queryClient } from "@/lib/query-client";
import { useProductSummary } from "@/hooks/queries/useProductSummary";
import { useProductReviews, type Review } from "@/hooks/queries/useProductReviews";
import { useOrders } from "@/hooks/queries/useOrders";
import { useSubmitReview } from "@/hooks/mutations/useSubmitReview";
import { notify } from "@/lib/toast";
import { formatRelativeTime } from "@/lib/utils";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/components/field";

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

// ── Review form (TanStack Form + @repo/ui) ────────────────────────────────────

interface ReviewFormValues {
  body: string;
  orderId: string;
  rating: number;
  title: string;
}

function ReviewForm({
  productId,
  productName,
  ordersLoading,
  orders,
  onSuccess,
}: {
  productId: string;
  productName: string;
  ordersLoading: boolean;
  orders: { id: string; orderNumber: string; createdAt: string }[];
  onSuccess: () => void;
}) {
  const submitMutation = useSubmitReview(productId);

  const form = useForm({
    defaultValues: {
      rating: 0,
      orderId: "",
      title: "",
      body: "",
    },
    onSubmit: ({ value }) => {
      if (value.rating === 0) {
        notify.error("Pilih rating bintang terlebih dahulu.");
        return;
      }
      if (!value.orderId.trim()) {
        notify.error("Pilih atau masukkan ID pesanan.");
        return;
      }
      submitMutation.mutate(
        {
          orderId: value.orderId.trim(),
          rating: value.rating,
          title: value.title.trim() || null,
          body: value.body.trim() || null,
        },
        {
          onSuccess: () => {
            form.reset();
            onSuccess();
          },
        }
      );
    },
  });

  // Auto-select first order when orders load
  useEffect(() => {
    if (orders.length > 0 && !form.getFieldValue("orderId")) {
      form.setFieldValue("orderId", orders[0].id);
    }
  }, [orders]);

  return (
    <form
      className="mt-4 space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
      onSubmit={e => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <h3 className="text-sm font-semibold text-gray-900">Beri Ulasanmu</h3>

      <FieldGroup>
        {/* ── Rating ─────────────────────────────────────────────────── */}
        <form.Field name="rating">
          {field => (
            <Field>
              <FieldLabel>
                Rating <span className="text-red-500">*</span>
              </FieldLabel>
              <StarPicker
                onChange={field.handleChange}
                value={field.state.value}
              />
            </Field>
          )}
        </form.Field>

        {/* ── Pesanan ────────────────────────────────────────────────── */}
        <form.Field name="orderId">
          {field => (
            <Field>
              <FieldLabel>
                Pesanan <span className="text-red-500">*</span>
              </FieldLabel>
              {ordersLoading ? (
                <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs text-gray-400">
                  <div className="border-t-brand-500 h-3 w-3 animate-spin rounded-full border-2 border-gray-300" />
                  Memuat pesanan…
                </div>
              ) : orders.length > 0 ? (
                <select
                  className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:ring-1 focus:outline-none"
                  onChange={e => field.handleChange(e.target.value)}
                  value={field.state.value}
                >
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      #{o.orderNumber} —{" "}
                      {new Date(o.createdAt).toLocaleDateString("id-ID")}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                  placeholder="Masukkan ID pesanan"
                  type="text"
                  value={field.state.value}
                />
              )}
              <p className="text-[10px] text-gray-400">
                Ulasan hanya untuk produk yang sudah dibeli.
              </p>
            </Field>
          )}
        </form.Field>

        {/* ── Judul (opsional) ───────────────────────────────────────── */}
        <form.Field name="title">
          {field => (
            <Field>
              <FieldLabel>
                Judul{" "}
                <span className="font-normal text-gray-400">(opsional)</span>
              </FieldLabel>
              <Input
                maxLength={150}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(e.target.value)}
                placeholder="Ringkas pendapatmu…"
                type="text"
                value={field.state.value}
              />
            </Field>
          )}
        </form.Field>

        {/* ── Ulasan (opsional) ──────────────────────────────────────── */}
        <form.Field name="body">
          {field => (
            <Field>
              <FieldLabel>
                Ulasan{" "}
                <span className="font-normal text-gray-400">(opsional)</span>
              </FieldLabel>
              <Textarea
                className="resize-none"
                maxLength={2000}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(e.target.value)}
                placeholder={`Bagikan pengalamanmu dengan ${productName}…`}
                rows={4}
                value={field.state.value}
              />
              <form.Subscribe selector={state => state.values.body}>
                {body => (
                  <p className="text-right text-[10px] text-gray-400">
                    {body.length}/2000
                  </p>
                )}
              </form.Subscribe>
            </Field>
          )}
        </form.Field>
      </FieldGroup>

      {submitMutation.isError && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {submitMutation.error instanceof Error
            ? submitMutation.error.message
            : "Gagal mengirim ulasan."}
        </div>
      )}

      {/* ── Submit button ─────────────────────────────────────────────── */}
      <form.Subscribe
        selector={state => ({
          rating: state.values.rating,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ rating, isSubmitting }) => (
          <Button
            className="w-full"
            disabled={rating === 0 || isSubmitting || submitMutation.isPending}
            type="submit"
          >
            {isSubmitting || submitMutation.isPending
              ? "Mengirim…"
              : "Kirim Ulasan"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function ProductReviewsInner({ productId, productName, isLoggedIn }: Props) {
  const [showForm, setShowForm] = useState(false);

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
  const loading = summaryLoading || reviewsLoading;
  const reviews = reviewPages?.pages.flatMap(p => p.data) ?? [];

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

              {/* Write review toggle */}
              <div className="mt-4">
                {isLoggedIn ? (
                  <Button
                    className="w-full"
                    onClick={() => setShowForm(v => !v)}
                    variant={showForm ? "outline" : "default"}
                  >
                    {showForm ? "Batal" : "Tulis Ulasan"}
                  </Button>
                ) : (
                  <a
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-gray-600 hover:bg-gray-50"
                    href={`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                  >
                    Login untuk menulis ulasan
                  </a>
                )}
              </div>

              {/* Review form */}
              {showForm && isLoggedIn && (
                <ReviewForm
                  key={showForm ? "open" : "closed"}
                  onSuccess={() => setShowForm(false)}
                  orders={orders}
                  ordersLoading={ordersLoading}
                  productId={productId}
                  productName={productName}
                />
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
                <Button
                  className="mt-6 w-full"
                  disabled={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                  variant="outline"
                >
                  {isFetchingNextPage ? (
                    <>
                      <div className="border-t-brand-500 h-4 w-4 animate-spin rounded-full border-2 border-gray-300" />
                      Memuat…
                    </>
                  ) : (
                    "Muat Lebih Banyak Ulasan"
                  )}
                </Button>
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
