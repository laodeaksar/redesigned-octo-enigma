import { useEffect, useRef, useState } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Menunggu Pembayaran",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Terkirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refund_requested: "Minta Refund",
  refunded: "Direfund",
};

const STATUS_ICONS: Record<string, string> = {
  pending_payment: "💳",
  processing: "📦",
  shipped: "🚚",
  delivered: "📬",
  completed: "✅",
  cancelled: "❌",
  refund_requested: "🔄",
  refunded: "💸",
};

const STATUS_COLORS: Record<string, { badge: string; bg: string; ring: string; bar: string }> = {
  pending_payment: { badge: "bg-yellow-100 text-yellow-800", bg: "bg-yellow-50", ring: "ring-yellow-300", bar: "bg-yellow-400" },
  processing:      { badge: "bg-blue-100 text-blue-800",    bg: "bg-blue-50",   ring: "ring-blue-300",   bar: "bg-blue-500"   },
  shipped:         { badge: "bg-indigo-100 text-indigo-800",bg: "bg-indigo-50", ring: "ring-indigo-300", bar: "bg-indigo-500" },
  delivered:       { badge: "bg-teal-100 text-teal-800",    bg: "bg-teal-50",   ring: "ring-teal-300",   bar: "bg-teal-500"   },
  completed:       { badge: "bg-green-100 text-green-800",  bg: "bg-green-50",  ring: "ring-green-300",  bar: "bg-green-500"  },
  cancelled:       { badge: "bg-red-100 text-red-800",      bg: "bg-red-50",    ring: "ring-red-300",    bar: "bg-red-500"    },
  refund_requested:{ badge: "bg-orange-100 text-orange-800",bg: "bg-orange-50", ring: "ring-orange-300", bar: "bg-orange-500" },
  refunded:        { badge: "bg-gray-100 text-gray-600",    bg: "bg-gray-50",   ring: "ring-gray-300",   bar: "bg-gray-400"   },
};

const PROGRESS_STEPS = [
  { key: "pending_payment", label: "Pesanan Dibuat",       icon: "💳" },
  { key: "processing",      label: "Diproses",             icon: "📦" },
  { key: "shipped",         label: "Dikirim",              icon: "🚚" },
  { key: "delivered",       label: "Tiba di Tujuan",       icon: "📬" },
  { key: "completed",       label: "Selesai",              icon: "✅" },
];

const STATUS_ORDER = ["pending_payment", "processing", "shipped", "delivered", "completed"];
const TERMINAL = new Set(["completed", "cancelled", "refunded"]);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StatusHistoryEntry {
  actorId?: string;
  note?: string | null;
  status: string;
  timestamp: string;
}

export interface ShippingInfo {
  courier: string;
  service: string;
  trackingNumber: string | null;
  estimatedDays?: number;
  shippedAt: string | null;
  deliveredAt: string | null;
  address: {
    recipientName: string;
    phone: string;
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
}

interface Props {
  cancellationNote?: string | null;
  cancellationReason?: string | null;
  initialStatus: string;
  initialStatusHistory: StatusHistoryEntry[];
  orderId: string;
  orderNumber: string;
  shipping: ShippingInfo;
  grandTotal: number;
  itemCount: number;
}

type ConnState = "connecting" | "connected" | "disconnected" | "terminal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDT(ts: string | Date) {
  return new Date(ts).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(ts: string | Date) {
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OrderTrackingTimeline({
  orderId,
  orderNumber,
  initialStatus,
  initialStatusHistory,
  cancellationReason,
  cancellationNote,
  shipping,
  grandTotal,
  itemCount,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [history, setHistory] = useState<StatusHistoryEntry[]>(initialStatusHistory);
  const [connState, setConnState] = useState<ConnState>("connecting");
  const [justChanged, setJustChanged] = useState(false);
  const [newStatusLabel, setNewStatusLabel] = useState("");

  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCount = useRef(0);
  const currentStatus = useRef(initialStatus);

  // ── SSE connection ──────────────────────────────────────────────────────────

  const connect = () => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource(`/api/orders/${orderId}/stream`);
    esRef.current = es;

    es.addEventListener("connected", () => {
      setConnState("connected");
      reconnectCount.current = 0;
    });

    es.addEventListener("order-update", (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        status: string;
        statusHistory?: StatusHistoryEntry[];
      };

      if (data.status !== currentStatus.current) {
        currentStatus.current = data.status;
        setStatus(data.status);
        setNewStatusLabel(STATUS_LABELS[data.status] ?? data.status);
        setJustChanged(true);
        setTimeout(() => setJustChanged(false), 4000);
      }

      if (data.statusHistory) setHistory(data.statusHistory);

      if (TERMINAL.has(data.status)) {
        setConnState("terminal");
        es.close();
      }
    });

    es.addEventListener("heartbeat", () => setConnState("connected"));

    es.onerror = () => {
      es.close();
      esRef.current = null;
      if (TERMINAL.has(currentStatus.current)) {
        setConnState("terminal");
        return;
      }
      setConnState("disconnected");
      const delay = Math.min(1000 * 2 ** reconnectCount.current, 30_000);
      reconnectCount.current++;
      reconnectTimer.current = setTimeout(connect, delay);
    };
  };

  useEffect(() => {
    if (TERMINAL.has(initialStatus)) {
      setConnState("terminal");
      return;
    }
    connect();
    return () => {
      esRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [orderId]);

  // ── Derived state ───────────────────────────────────────────────────────────

  const isCancelled = ["cancelled", "refund_requested", "refunded"].includes(status);
  const currentStepIdx = STATUS_ORDER.indexOf(status);
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.processing;
  const progressPct = isCancelled ? 0 : Math.max(0, (currentStepIdx / (PROGRESS_STEPS.length - 1)) * 100);

  // Sort history newest-first for the activity log
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Live update toast ─────────────────────────────────────────────── */}
      {justChanged && (
        <div className="animate-in slide-in-from-top-2 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-green-800 shadow-md">
          <span className="text-2xl">{STATUS_ICONS[status]}</span>
          <div>
            <p className="font-semibold">Status diperbarui!</p>
            <p className="text-sm text-green-700">Pesananmu sekarang: <strong>{newStatusLabel}</strong></p>
          </div>
        </div>
      )}

      {/* ── Hero status card ──────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl border px-6 py-6 shadow-sm ${colors.bg} border-gray-100`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full text-3xl shadow-inner ring-4 ${colors.ring} bg-white`}>
              {STATUS_ICONS[status] ?? "📦"}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Status Pesanan
              </p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">
                {STATUS_LABELS[status] ?? status}
              </p>
              <p className="mt-0.5 font-mono text-xs text-gray-400">{orderNumber}</p>
            </div>
          </div>

          {/* Connection indicator */}
          <div className="shrink-0 text-right">
            {connState === "connected" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-green-600 shadow-sm ring-1 ring-green-100">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Live
              </span>
            )}
            {connState === "terminal" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm ring-1 ring-gray-100">
                Selesai
              </span>
            )}
            {connState === "disconnected" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-orange-500 shadow-sm ring-1 ring-orange-100">
                Menghubungkan…
              </span>
            )}
            {connState === "connecting" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-400 shadow-sm ring-1 ring-gray-100">
                Menghubungkan…
              </span>
            )}
          </div>
        </div>

        {/* Quick stats row */}
        <div className="mt-5 flex flex-wrap gap-5 border-t border-white/60 pt-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">Total</p>
            <p className="font-semibold text-gray-800">{formatIDR(grandTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Produk</p>
            <p className="font-semibold text-gray-800">{itemCount} item</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Kurir</p>
            <p className="font-semibold text-gray-800">
              {shipping.courier.toUpperCase()} — {shipping.service}
            </p>
          </div>
          {shipping.estimatedDays && status !== "delivered" && status !== "completed" && (
            <div>
              <p className="text-xs text-gray-400">Estimasi</p>
              <p className="font-semibold text-gray-800">{shipping.estimatedDays} hari kerja</p>
            </div>
          )}
          {shipping.deliveredAt && (
            <div>
              <p className="text-xs text-gray-400">Diterima</p>
              <p className="font-semibold text-gray-800">{formatDateShort(shipping.deliveredAt)}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Cancellation banner ───────────────────────────────────────────── */}
      {isCancelled && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-red-800">
          <span className="mt-0.5 text-2xl">❌</span>
          <div>
            <p className="font-semibold">{STATUS_LABELS[status] ?? status}</p>
            {cancellationReason && (
              <p className="mt-0.5 text-sm">
                Alasan: <span className="font-medium">{cancellationReason.replace(/_/g, " ")}</span>
              </p>
            )}
            {cancellationNote && (
              <p className="mt-1 text-sm text-red-600 italic">"{cancellationNote}"</p>
            )}
          </div>
        </div>
      )}

      {/* ── Progress bar + steps ──────────────────────────────────────────── */}
      {!isCancelled && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-gray-400">
            Progress Pengiriman
          </h2>

          {/* Progress bar */}
          <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${colors.bar}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Steps */}
          <div className="relative flex items-start justify-between">
            {PROGRESS_STEPS.map((step, i) => {
              const done = currentStepIdx >= i;
              const active = currentStepIdx === i;
              const historyEntry = history.find(e => e.status === step.key);

              return (
                <div
                  key={step.key}
                  className="relative flex flex-1 flex-col items-center gap-1 text-center"
                >
                  {/* Connector line */}
                  {i < PROGRESS_STEPS.length - 1 && (
                    <div
                      className={`absolute top-4 left-1/2 h-0.5 w-full -translate-y-1/2 transition-colors duration-700 ${
                        done && currentStepIdx > i ? "bg-green-400" : "bg-gray-150"
                      }`}
                    />
                  )}

                  {/* Circle */}
                  <div
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm ring-2 ring-offset-2 transition-all duration-500 ${
                      done
                        ? "bg-green-500 ring-green-200"
                        : "bg-gray-100 ring-transparent"
                    } ${active ? "scale-125 shadow-md ring-green-300" : ""}`}
                  >
                    {done ? (
                      active ? (
                        <span className="text-base leading-none">{step.icon}</span>
                      ) : (
                        <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )
                    ) : (
                      <span className="text-sm opacity-30">{step.icon}</span>
                    )}
                  </div>

                  {/* Label */}
                  <p className={`mt-1 text-[11px] leading-tight ${done ? "font-semibold text-gray-800" : "text-gray-400"}`}>
                    {step.label}
                  </p>

                  {/* Timestamp */}
                  {historyEntry && (
                    <p className="text-[10px] text-gray-400 leading-tight">
                      {new Date(historyEntry.timestamp).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Courier tracking card ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400">
          Info Pengiriman
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Courier + resi */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Kurir</p>
            <p className="font-semibold text-gray-900">
              {shipping.courier.toUpperCase()} — {shipping.service}
            </p>

            {shipping.trackingNumber ? (
              <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Nomor Resi</p>
                <p className="mt-1 font-mono text-xl font-bold tracking-wider text-indigo-900">
                  {shipping.trackingNumber}
                </p>
                <div className="mt-2 flex gap-3">
                  <a
                    href={`https://cekresi.com/?noresi=${shipping.trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                  >
                    Lacak di CekResi
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400 italic">
                {status === "pending_payment" || status === "processing"
                  ? "Nomor resi akan tersedia setelah paket dikirim"
                  : "Nomor resi tidak tersedia"}
              </p>
            )}

            {shipping.shippedAt && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                <span>📤</span>
                <span>Dikirim: <strong>{formatDT(shipping.shippedAt)}</strong></span>
              </p>
            )}
            {shipping.deliveredAt && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                <span>📬</span>
                <span>Diterima: <strong>{formatDT(shipping.deliveredAt)}</strong></span>
              </p>
            )}
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Alamat Tujuan</p>
            <p className="font-semibold text-gray-900">{shipping.address.recipientName}</p>
            <p className="text-sm text-gray-500">{shipping.address.phone}</p>
            <address className="mt-1 not-italic text-sm leading-relaxed text-gray-600">
              {shipping.address.street}<br />
              {shipping.address.city}, {shipping.address.province} {shipping.address.postalCode}
            </address>
          </div>
        </div>
      </div>

      {/* ── Activity log ─────────────────────────────────────────────────── */}
      {sortedHistory.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-gray-400">
            Riwayat Status
          </h2>

          <ol className="relative space-y-0">
            {sortedHistory.map((entry, idx) => {
              const isLatest = idx === 0;
              const entryColors = STATUS_COLORS[entry.status] ?? STATUS_COLORS.processing;
              const isLast = idx === sortedHistory.length - 1;

              return (
                <li key={`${entry.status}-${entry.timestamp}`} className="flex gap-4">
                  {/* Left: icon + connector */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ring-4 ring-white shadow-sm ${
                        isLatest ? "bg-green-500" : "bg-gray-100"
                      }`}
                    >
                      {isLatest ? (
                        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span className="text-sm opacity-50">{STATUS_ICONS[entry.status]}</span>
                      )}
                    </div>
                    {!isLast && (
                      <div className="mt-1 w-px flex-1 bg-gray-100" style={{ minHeight: "2rem" }} />
                    )}
                  </div>

                  {/* Right: content */}
                  <div className={`pb-6 pt-1 ${isLast ? "pb-0" : ""}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${entryColors.badge}`}
                      >
                        {STATUS_LABELS[entry.status] ?? entry.status}
                      </span>
                      {isLatest && (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 ring-1 ring-green-200">
                          Saat ini
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{formatDT(entry.timestamp)}</p>
                    {entry.note && (
                      <p className="mt-1.5 text-sm text-gray-600 italic">"{entry.note}"</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* ── Help section ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gray-50 px-5 py-4 text-sm">
        <p className="font-semibold text-gray-800">Ada masalah dengan pesananmu?</p>
        <p className="mt-1 text-gray-500 leading-relaxed">
          Hubungi kami di{" "}
          <a href="mailto:support@my-ecommerce.com" className="font-medium text-green-700 hover:underline">
            support@my-ecommerce.com
          </a>{" "}
          dan sertakan nomor pesanan <span className="font-mono font-semibold text-gray-700">{orderNumber}</span>.
        </p>
      </div>
    </div>
  );
}
