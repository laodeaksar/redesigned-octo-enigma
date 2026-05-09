// =============================================================================
// Shared order utilities — status badge, query keys, constants
// =============================================================================

import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/utils";
import { Badge } from "@repo/ui/components/badge";

// ── Query keys ────────────────────────────────────────────────────────────────

export const orderKeys = {
  list: (params: Record<string, unknown>) =>
    ["orders", "list", params] as const,
  detail: (id: string) => ["orders", "detail", id] as const,
};

// ── Status badge classes → @repo/ui Badge ─────────────────────────────────────

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending_payment:
    "border border-yellow-300 bg-yellow-50 text-yellow-800",
  processing: "border-0 bg-blue-100 text-blue-800",
  shipped:    "border-0 bg-indigo-100 text-indigo-800",
  delivered:  "border-0 bg-teal-100 text-teal-800",
  completed:  "border-0 bg-green-600 text-white",
  cancelled:  "",
  refund_requested:
    "border border-orange-300 bg-orange-50 text-orange-800",
  refunded:   "border-0 bg-gray-100 text-gray-600",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABELS[status] ?? status;
  const isDestructive = status === "cancelled";
  return (
    <Badge
      className={cn("font-medium", STATUS_BADGE_CLASS[status])}
      variant={isDestructive ? "destructive" : "outline"}
    >
      {label}
    </Badge>
  );
}

// ── Shared constants ──────────────────────────────────────────────────────────

export const ALL_ORDER_STATUSES = [
  "pending_payment",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "refund_requested",
  "refunded",
] as const;

export const BULK_TARGET_STATUSES = [
  { value: "processing", label: "Diproses" },
  { value: "shipped",    label: "Dikirim" },
  { value: "delivered",  label: "Terkirim" },
  { value: "completed",  label: "Selesai" },
  { value: "cancelled",  label: "Dibatalkan" },
] as const;

export const CANCELLATION_REASONS = [
  { value: "customer_request",     label: "Permintaan Pelanggan" },
  { value: "out_of_stock",         label: "Stok Habis" },
  { value: "payment_failed",       label: "Pembayaran Gagal" },
  { value: "fraud_suspected",      label: "Dugaan Penipuan" },
  { value: "address_undeliverable",label: "Alamat Tidak Terkirim" },
  { value: "other",                label: "Lainnya" },
] as const;
