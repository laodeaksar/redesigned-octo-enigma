import { useEffect, useRef, useState } from "react";

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

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-teal-100 text-teal-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refund_requested: "bg-orange-100 text-orange-800",
  refunded: "bg-gray-100 text-gray-600",
};

const TIMELINE_STEPS = [
  { key: "pending_payment", label: "Menunggu Pembayaran", icon: "💳" },
  { key: "processing", label: "Diproses", icon: "📦" },
  { key: "shipped", label: "Dikirim", icon: "🚚" },
  { key: "delivered", label: "Terkirim", icon: "📬" },
  { key: "completed", label: "Selesai", icon: "✅" },
];

const STATUS_ORDER = [
  "pending_payment",
  "processing",
  "shipped",
  "delivered",
  "completed",
];
const TERMINAL = new Set(["completed", "cancelled", "refunded"]);

interface StatusHistoryEntry {
  actorId?: string;
  note?: string | null;
  status: string;
  timestamp: string;
}

interface Props {
  cancellationNote?: string | null;
  cancellationReason?: string | null;
  initialStatus: string;
  initialStatusHistory: StatusHistoryEntry[];
  orderId: string;
}

type ConnState = "connecting" | "connected" | "disconnected" | "terminal";

function formatDT(ts: string | Date) {
  return new Date(ts).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderStatusTracker({
  orderId,
  initialStatus,
  initialStatusHistory,
  cancellationReason,
  cancellationNote,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [history, setHistory] =
    useState<StatusHistoryEntry[]>(initialStatusHistory);
  const [connState, setConnState] = useState<ConnState>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [justChanged, setJustChanged] = useState(false);

  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCount = useRef(0);
  const currentStatus = useRef(initialStatus);

  const connect = () => {
    if (esRef.current) {
      esRef.current.close();
    }

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
        updatedAt?: string;
      };

      if (data.status !== currentStatus.current) {
        currentStatus.current = data.status;
        setStatus(data.status);
        setLastUpdated(new Date());
        setJustChanged(true);
        setTimeout(() => setJustChanged(false), 2000);
      }

      if (data.statusHistory) {
        setHistory(data.statusHistory);
      }

      if (TERMINAL.has(data.status)) {
        setConnState("terminal");
        es.close();
      }
    });

    es.addEventListener("heartbeat", () => {
      setConnState("connected");
    });

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
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
    };
  }, [orderId]);

  const isCancelled = ["cancelled", "refund_requested", "refunded"].includes(
    status
  );
  const currentStepIdx = STATUS_ORDER.indexOf(status);
  const statusColor = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600";

  return (
    <div className="space-y-6">
      {/* ── Status badge row ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-500 ${statusColor} ${justChanged ? "scale-105 shadow-md" : ""}`}
        >
          {STATUS_LABELS[status] ?? status}
        </span>

        {connState === "connected" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Live
          </span>
        )}

        {connState === "connecting" && (
          <span className="text-xs text-gray-400">Menghubungkan…</span>
        )}

        {connState === "disconnected" && (
          <span className="text-xs text-orange-500">
            Mencoba menghubungkan ulang…
          </span>
        )}

        {lastUpdated && (
          <span className="text-xs text-gray-400">
            Diperbarui{" "}
            {lastUpdated.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* ── Status changed toast ─────────────────────────────────────────── */}
      {justChanged && (
        <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-sm">
          <svg
            className="h-4 w-4 shrink-0"
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
          Status pesanan diperbarui ke{" "}
          <strong className="ml-1">{STATUS_LABELS[status] ?? status}</strong>
        </div>
      )}

      {/* ── Timeline (non-cancelled) ──────────────────────────────────────── */}
      {!isCancelled && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="relative flex items-start justify-between gap-2">
            {TIMELINE_STEPS.map((step, i) => {
              const done = currentStepIdx >= i;
              const active = currentStepIdx === i;
              const entry = history.find(e => e.status === step.key);

              return (
                <div
                  className="relative z-10 flex flex-1 flex-col items-center gap-1 text-center"
                  key={step.key}
                >
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div
                      className={`absolute top-4 left-1/2 h-0.5 w-full -translate-y-1/2 transition-colors duration-700 ${
                        done && currentStepIdx > i
                          ? "bg-green-400"
                          : "bg-gray-200"
                      }`}
                    />
                  )}

                  <div
                    className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-lg ring-2 ring-offset-2 transition-all duration-500 ${
                      done
                        ? "bg-green-500 ring-green-200"
                        : "bg-gray-100 ring-transparent"
                    } ${active ? "scale-110 shadow-md ring-green-300" : ""}`}
                  >
                    {done ? (
                      active ? (
                        <span>{step.icon}</span>
                      ) : (
                        <svg
                          className="h-4 w-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M5 13l4 4L19 7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )
                    ) : (
                      <span className="text-base opacity-40">{step.icon}</span>
                    )}
                  </div>

                  <p
                    className={`mt-1 text-xs leading-tight ${
                      done ? "font-semibold text-gray-800" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>

                  {entry && (
                    <p className="text-[10px] text-gray-400">
                      {formatDT(entry.timestamp)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Cancelled / refund banner ────────────────────────────────────── */}
      {isCancelled && (
        <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-red-800">
          <span className="text-2xl">❌</span>
          <div>
            <p className="font-semibold">{STATUS_LABELS[status] ?? status}</p>
            {cancellationReason && (
              <p className="mt-0.5 text-sm">
                Alasan: {cancellationReason.replace(/_/g, " ")}
              </p>
            )}
            {cancellationNote && (
              <p className="text-sm text-red-600">{cancellationNote}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
