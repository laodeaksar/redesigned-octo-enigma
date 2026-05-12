// =============================================================================
// OrderDetailIsland — live-polling shipping & tracking card (client:load)
//
// WHY THIS EXISTS
// ───────────────
// The order detail page SSR-renders shipping data once at request time.
// When an admin later assigns a tracking number (processing → shipped) or the
// courier marks the package as delivered, the static HTML won't reflect that
// until the user manually refreshes.
//
// This island replaces the static shipping card with a live-polling version:
//   • Hydrates instantly from `initialOrder` (no loading flash)
//   • Polls every 30 s via useOrderDetail refetchInterval
//   • Stops polling automatically when the order reaches a terminal state
//     (completed / cancelled / refunded) — no wasted network activity
//   • Shows a copy-to-clipboard button on the tracking number
//   • Shows a manual refresh button between polls
//
// COMPLEMENT to OrderStatusTracker
// ─────────────────────────────────
// OrderStatusTracker (already in [id].astro) uses SSE for instant status +
// timeline updates. SSE only pushes status events — it does NOT push the full
// order object with tracking numbers or delivery timestamps. This island fills
// exactly that gap.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";

import type { StorefrontOrderDetail } from "@repo/common/types";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { useOrderDetail } from "@/hooks/queries/useOrderDetail";
import { formatDateTime } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const TERMINAL = new Set(["completed", "cancelled", "refunded"]);
const POLL_INTERVAL_MS = 30_000;

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available — fail silently
    }
  }

  return (
    <button
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
        copied
          ? "bg-green-100 text-green-700"
          : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
      }`}
      onClick={handleCopy}
      type="button"
    >
      {copied ? (
        <>
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Disalin!
        </>
      ) : (
        <>
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Salin
        </>
      )}
    </button>
  );
}

// ── Sync indicator ────────────────────────────────────────────────────────────

function SyncIndicator({
  isTerminal,
  isFetching,
  lastSynced,
  onRefresh,
}: {
  isTerminal: boolean;
  isFetching: boolean;
  lastSynced: Date | null;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {isTerminal ? (
        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Selesai
        </span>
      ) : isFetching ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-blue-500">
          <svg
            className="h-3 w-3 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              d="M4 12a8 8 0 018-8"
              fill="currentColor"
            />
          </svg>
          Memperbarui…
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gray-300 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gray-400" />
          </span>
          Otomatis diperbarui
        </span>
      )}

      {lastSynced && !isTerminal && (
        <span className="text-[10px] text-gray-300">
          ·{" "}
          {lastSynced.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      )}

      {!isTerminal && !isFetching && (
        <button
          className="ml-0.5 rounded p-0.5 text-gray-300 transition-colors hover:text-gray-500"
          onClick={onRefresh}
          title="Perbarui sekarang"
          type="button"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Inner component ───────────────────────────────────────────────────────────

function OrderDetailIslandInner({
  orderId,
  initialOrder,
}: {
  orderId: string;
  initialOrder: StorefrontOrderDetail;
}) {
  const qc = useQueryClient();
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  // Track the previous data reference to detect background refetches
  const prevDataRef = useRef<StorefrontOrderDetail | undefined>(undefined);

  const isInitialTerminal = TERMINAL.has(initialOrder.status);

  const { data: liveOrder, isFetching, dataUpdatedAt } = useOrderDetail(orderId, {
    initialData: initialOrder,
    refetchInterval: isInitialTerminal ? false : POLL_INTERVAL_MS,
    enabled: !isInitialTerminal,
  });

  // Update lastSynced whenever a background refetch completes (dataUpdatedAt changes)
  useEffect(() => {
    if (!dataUpdatedAt) return;
    // Skip the very first mount (initialData counts as an update but isn't a real fetch)
    if (prevDataRef.current === undefined) {
      prevDataRef.current = liveOrder;
      return;
    }
    if (liveOrder !== prevDataRef.current) {
      prevDataRef.current = liveOrder;
      setLastSynced(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt, liveOrder]);

  // Prefer live fetched data; fall back to initialOrder on first render
  const o = liveOrder ?? initialOrder;
  const isTerminal = TERMINAL.has(o.status);

  const { shipping } = o;
  const hasTracking = !!shipping.trackingNumber;

  function handleRefresh() {
    void qc.invalidateQueries({
      queryKey: queryKeys.orders.detail(orderId),
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* ── Card header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900">Pengiriman</h2>
        <SyncIndicator
          isFetching={isFetching}
          isTerminal={isTerminal}
          lastSynced={lastSynced}
          onRefresh={handleRefresh}
        />
      </div>

      <div className="p-5">
        <div className="grid gap-6 text-sm sm:grid-cols-2">
          {/* ── Left: courier + tracking number ──────────────────────── */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Kurir
            </p>
            <p className="font-semibold text-gray-900">
              {shipping.courier.toUpperCase()} — {shipping.service}
            </p>
            {shipping.estimatedDays && (
              <p className="mt-0.5 text-xs text-gray-500">
                Estimasi {shipping.estimatedDays} hari kerja
              </p>
            )}

            {/* ── Tracking number ─────────────────────────────────────── */}
            {hasTracking ? (
              <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    Nomor Resi
                  </p>
                  <CopyButton text={shipping.trackingNumber!} />
                </div>
                <p className="font-mono text-lg font-bold tracking-wider text-indigo-900">
                  {shipping.trackingNumber}
                </p>
                <a
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                  href={`https://cekresi.com/?noresi=${shipping.trackingNumber}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Lacak Paket
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3">
                {isTerminal ? (
                  <p className="text-xs text-gray-400">
                    Tidak ada nomor resi
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yellow-500" />
                    </span>
                    Nomor resi akan muncul otomatis saat paket dikirim
                  </p>
                )}
              </div>
            )}

            {/* ── Shipping timestamps (appear live when updated) ──────── */}
            <div className="mt-3 space-y-1.5">
              {shipping.shippedAt && (
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span aria-hidden>📤</span>
                  <span>
                    Dikirim:{" "}
                    <strong>{formatDateTime(shipping.shippedAt)}</strong>
                  </span>
                </p>
              )}
              {shipping.deliveredAt && (
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span aria-hidden>📬</span>
                  <span>
                    Diterima:{" "}
                    <strong>{formatDateTime(shipping.deliveredAt)}</strong>
                  </span>
                </p>
              )}
              {!shipping.shippedAt && !isTerminal && (
                <p className="text-xs italic text-gray-400">
                  Tanggal pengiriman akan diperbarui otomatis
                </p>
              )}
            </div>
          </div>

          {/* ── Right: delivery address ───────────────────────────────── */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Alamat Pengiriman
            </p>
            <p className="font-semibold text-gray-900">
              {shipping.address.recipientName}
            </p>
            <p className="text-gray-500">{shipping.address.phone}</p>
            <address className="mt-1 not-italic leading-relaxed text-gray-600">
              {shipping.address.street}
              <br />
              {shipping.address.city}, {shipping.address.province}{" "}
              {shipping.address.postalCode}
            </address>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initialOrder: StorefrontOrderDetail;
  orderId: string;
}

// ── Exported island ───────────────────────────────────────────────────────────

export default function OrderDetailIsland({ orderId, initialOrder }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <OrderDetailIslandInner initialOrder={initialOrder} orderId={orderId} />
    </QueryClientProvider>
  );
}
