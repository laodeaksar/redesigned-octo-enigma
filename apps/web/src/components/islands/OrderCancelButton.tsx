// =============================================================================
// OrderCancelButton — React island, client:load
// Lets customers cancel their own pending_payment orders with a reason selector
// and confirmation dialog.
//
// Integration:
//   @repo/common/schemas → cancelOrderSchema + CancelOrderInput (Zod validation)
//   @repo/ui             → AlertDialog, RadioGroup, Button, Label, Textarea
//   @tanstack/react-query → useMutation (POST /orders/:id/cancel)
//   @/lib/toast          → notify (sonner)
//
// API: POST /orders/:id/cancel
//   Body: { reason: "customer_request", note?: string }
//   Cancellable statuses: pending_payment (service also allows processing,
//   but customers can only self-cancel before payment is confirmed)
// =============================================================================

import { useState } from "react";
import { useMutation, QueryClientProvider } from "@tanstack/react-query";

import {
  cancelOrderSchema,
  type CancelOrderInput,
} from "@repo/common/schemas";

import { queryClient } from "@/lib/query-client";
import { apiProxy } from "@/lib/api";
import { notify } from "@/lib/toast";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Textarea } from "@repo/ui/components/textarea";

// ── Sub-reason options ────────────────────────────────────────────────────────
// All map to "customer_request" (the only user-appropriate CancellationReason).
// The selected label is sent as the `note` field so ops/support can see why.

const SUB_REASONS = [
  {
    value: "Berubah pikiran / tidak jadi beli",
    label: "Berubah pikiran / tidak jadi beli",
  },
  {
    value: "Harga lebih murah di tempat lain",
    label: "Harga lebih murah di tempat lain",
  },
  {
    value: "Alamat atau detail pesanan salah",
    label: "Alamat atau detail pesanan salah",
  },
  {
    value: "Ingin mengganti produk atau varian",
    label: "Ingin mengganti produk atau varian",
  },
  {
    value: "other",
    label: "Alasan lain…",
  },
] as const;

type SubReasonValue = (typeof SUB_REASONS)[number]["value"];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
}

// ── Main component ────────────────────────────────────────────────────────────

function OrderCancelButtonInner({ orderId, orderNumber, orderStatus }: Props) {
  // Guard: only pending_payment orders can be self-cancelled by customers
  if (orderStatus !== "pending_payment") return null;

  const [open, setOpen] = useState(false);
  const [subReason, setSubReason] = useState<SubReasonValue | "">("");
  const [customNote, setCustomNote] = useState("");

  const isOther = subReason === "other";

  // Build the `note` field: selected sub-reason + optional extra note
  const buildNote = (): string | undefined => {
    if (isOther) {
      return customNote.trim() || undefined;
    }
    const parts = [subReason as string, customNote.trim()].filter(Boolean);
    return parts.length > 0 ? parts.join(" — ") : undefined;
  };

  const canSubmit =
    subReason !== "" && (!isOther || customNote.trim().length > 0);

  // ── Mutation ────────────────────────────────────────────────────────────────

  const cancelMutation = useMutation({
    mutationFn: async () => {
      // Validate with @repo/common schema before sending
      const payload: CancelOrderInput = cancelOrderSchema.parse({
        reason: "customer_request",
        note: buildNote(),
      });
      await apiProxy.post(`/orders/${orderId}/cancel`, payload);
    },

    onSuccess: () => {
      setOpen(false);
      notify.success(
        `Pesanan ${orderNumber} berhasil dibatalkan`,
        "Stok produk dikembalikan. Halaman akan dimuat ulang…"
      );
      // Let the toast render before navigating
      setTimeout(() => {
        window.location.href = `/orders/${orderId}`;
      }, 1800);
    },

    onError: (err: Error) => {
      notify.error(
        "Gagal membatalkan pesanan",
        err.message || "Silakan coba lagi atau hubungi dukungan kami."
      );
    },
  });

  // ── Dialog open/close ───────────────────────────────────────────────────────

  function handleOpenChange(next: boolean) {
    if (cancelMutation.isPending) return; // block accidental close while mutating
    setOpen(next);
    if (!next) {
      setSubReason("");
      setCustomNote("");
      cancelMutation.reset();
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {/* Trigger — renders as a destructive-outline Button */}
      <AlertDialogTrigger
        render={
          <Button
            className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
            size="sm"
            variant="outline"
          />
        }
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M6 18 18 6M6 6l12 12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Batalkan Pesanan
      </AlertDialogTrigger>

      {/* Dialog */}
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          {/* Warning icon */}
          <AlertDialogMedia className="bg-red-50">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </AlertDialogMedia>

          <AlertDialogTitle>
            Batalkan pesanan{" "}
            <span className="font-mono">{orderNumber}</span>?
          </AlertDialogTitle>

          <AlertDialogDescription>
            Tindakan ini tidak dapat diurungkan. Stok produk akan dikembalikan
            secara otomatis setelah pembatalan dikonfirmasi.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* ── Reason selector ──────────────────────────────────────────────── */}
        <div className="space-y-2.5">
          <p className="text-sm font-medium text-gray-800">
            Alasan pembatalan{" "}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </p>

          <RadioGroup
            className="gap-2"
            onValueChange={val => setSubReason(val as SubReasonValue)}
            value={subReason}
          >
            {SUB_REASONS.map(({ value, label }) => (
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors select-none ${
                  subReason === value
                    ? "border-red-300 bg-red-50 text-red-800 font-medium"
                    : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
                key={value}
              >
                <RadioGroupItem value={value} />
                {label}
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* ── Additional note ───────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label
            className="text-sm font-medium text-gray-700"
            htmlFor="cancel-note"
          >
            {isOther ? (
              <>
                Tuliskan alasanmu{" "}
                <span className="text-red-500" aria-hidden="true">
                  *
                </span>
              </>
            ) : (
              "Catatan tambahan (opsional)"
            )}
          </Label>
          <Textarea
            id="cancel-note"
            maxLength={450}
            onChange={e => setCustomNote(e.target.value)}
            placeholder={
              isOther
                ? "Ceritakan alasanmu membatalkan pesanan ini…"
                : "Ada hal lain yang ingin kamu sampaikan? (opsional)"
            }
            rows={3}
            value={customNote}
          />
          <p className="text-right text-[10px] text-gray-400">
            {customNote.length}/450
          </p>
        </div>

        {/* Inline mutation error */}
        {cancelMutation.isError && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            {cancelMutation.error instanceof Error
              ? cancelMutation.error.message
              : "Gagal membatalkan pesanan. Silakan coba lagi."}
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelMutation.isPending}>
            Jangan, kembali
          </AlertDialogCancel>

          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={!canSubmit || cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
            type="button"
          >
            {cancelMutation.isPending ? (
              <>
                <svg
                  className="mr-1.5 h-3.5 w-3.5 animate-spin"
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
                Membatalkan…
              </>
            ) : (
              "Ya, batalkan pesanan"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Export with QueryClientProvider ──────────────────────────────────────────

export default function OrderCancelButton(props: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <OrderCancelButtonInner {...props} />
    </QueryClientProvider>
  );
}
