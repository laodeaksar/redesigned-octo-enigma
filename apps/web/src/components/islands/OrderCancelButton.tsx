// =============================================================================
// OrderCancelButton — React island, client:load
// Lets customers cancel their own pending_payment orders.
//
// State:   local dialog + form state only
// Data:    useCancelOrder hook (POST /orders/:id/cancel)
// Schema:  cancelOrderSchema from @repo/common/schemas (validated in hook)
// Toast:   notify via @/lib/toast (defined in hook)
// =============================================================================

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import type { CancelOrderInput } from "@repo/common/schemas";

import { queryClient } from "@/lib/query-client";
import { useCancelOrder } from "@/hooks/mutations/useCancelOrder";

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
// All customer cancellations use reason: "customer_request".
// The selected label is forwarded as the `note` so ops/support sees context.

const SUB_REASONS = [
  { value: "Berubah pikiran / tidak jadi beli",       label: "Berubah pikiran / tidak jadi beli" },
  { value: "Harga lebih murah di tempat lain",         label: "Harga lebih murah di tempat lain" },
  { value: "Alamat atau detail pesanan salah",         label: "Alamat atau detail pesanan salah" },
  { value: "Ingin mengganti produk atau varian",       label: "Ingin mengganti produk atau varian" },
  { value: "other",                                    label: "Alasan lain…" },
] as const;

type SubReasonValue = (typeof SUB_REASONS)[number]["value"];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
}

// ── Inner component (needs QueryClientProvider parent) ────────────────────────

function OrderCancelButtonInner({ orderId, orderNumber, orderStatus }: Props) {
  if (orderStatus !== "pending_payment") return null;

  const [open, setOpen]           = useState(false);
  const [subReason, setSubReason] = useState<SubReasonValue | "">("");
  const [customNote, setCustomNote] = useState("");

  const isOther  = subReason === "other";
  const canSubmit = subReason !== "" && (!isOther || customNote.trim().length > 0);

  const cancelMutation = useCancelOrder(orderId, orderNumber);

  // Build the `note` sent to the API: selected sub-reason + optional extra note
  function buildNote(): string | undefined {
    if (isOther) return customNote.trim() || undefined;
    const parts = [subReason as string, customNote.trim()].filter(Boolean);
    return parts.length > 0 ? parts.join(" — ") : undefined;
  }

  function resetForm() {
    setSubReason("");
    setCustomNote("");
    cancelMutation.reset();
  }

  function handleOpenChange(next: boolean) {
    if (cancelMutation.isPending) return;
    setOpen(next);
    if (!next) resetForm();
  }

  function handleSubmit() {
    const payload: CancelOrderInput = {
      reason: "customer_request",
      note: buildNote(),
    };

    cancelMutation.mutate(payload, {
      onSuccess: () => {
        setOpen(false);
        resetForm();
        setTimeout(() => {
          window.location.href = `/orders/${orderId}`;
        }, 1800);
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        render={
          <Button
            className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
            size="sm"
            variant="outline"
          />
        }
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Batalkan Pesanan
      </AlertDialogTrigger>

      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-red-50">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </AlertDialogMedia>

          <AlertDialogTitle>
            Batalkan pesanan <span className="font-mono">{orderNumber}</span>?
          </AlertDialogTitle>

          <AlertDialogDescription>
            Tindakan ini tidak dapat diurungkan. Stok produk akan dikembalikan
            secara otomatis setelah pembatalan dikonfirmasi.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Reason selector */}
        <div className="space-y-2.5">
          <p className="text-sm font-medium text-gray-800">
            Alasan pembatalan{" "}
            <span aria-hidden="true" className="text-red-500">*</span>
          </p>

          <RadioGroup
            className="gap-2"
            onValueChange={val => setSubReason(val as SubReasonValue)}
            value={subReason}
          >
            {SUB_REASONS.map(({ value, label }) => (
              <label
                className={`flex cursor-pointer select-none items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  subReason === value
                    ? "border-red-300 bg-red-50 font-medium text-red-800"
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

        {/* Additional note */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700" htmlFor="cancel-note">
            {isOther ? (
              <>Tuliskan alasanmu <span aria-hidden="true" className="text-red-500">*</span></>
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
          <p className="text-right text-[10px] text-gray-400">{customNote.length}/450</p>
        </div>

        {/* Inline error */}
        {cancelMutation.isError && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            {cancelMutation.error instanceof Error
              ? cancelMutation.error.message
              : "Gagal membatalkan pesanan. Silakan coba lagi."}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelMutation.isPending}>
            Jangan, kembali
          </AlertDialogCancel>

          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={!canSubmit || cancelMutation.isPending}
            onClick={handleSubmit}
            type="button"
          >
            {cancelMutation.isPending ? (
              <>
                <svg className="mr-1.5 h-3.5 w-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
