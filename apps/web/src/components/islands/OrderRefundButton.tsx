// =============================================================================
// OrderRefundButton — React island, client:load
// Lets customers request a refund for their delivered orders.
//
// State:   local dialog + form state only
// Data:    useRequestRefund hook (POST /orders/:id/refund)
// Schema:  requestRefundSchema from @repo/common/schemas (validated in hook)
// Toast:   notify via @/lib/toast (defined in hook)
//
// Eligibility: order.status === "delivered"
// After submit: order transitions to "refund_requested" (admin reviews)
// =============================================================================

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import type { RequestRefundInput } from "@repo/common/schemas";

import { queryClient } from "@/lib/query-client";
import { useRequestRefund } from "@/hooks/mutations/useRequestRefund";

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

// ── Refund reason options ─────────────────────────────────────────────────────
// Customer-appropriate subset of refundReasonSchema values.
// "order_cancelled" and "admin_action" are system/admin-only — excluded here.

const REFUND_REASONS = [
  {
    value: "defective_product" as const,
    label: "Produk rusak atau cacat",
    hint: "Produk yang diterima dalam kondisi rusak atau tidak berfungsi",
  },
  {
    value: "wrong_item" as const,
    label: "Produk tidak sesuai pesanan",
    hint: "Produk, ukuran, atau varian yang diterima berbeda dari yang dipesan",
  },
  {
    value: "item_not_received" as const,
    label: "Pesanan belum diterima",
    hint: "Status terkirim tetapi barang tidak sampai",
  },
  {
    value: "customer_request" as const,
    label: "Alasan lainnya",
    hint: "Tuliskan alasanmu di kolom catatan di bawah",
  },
] as const;

type RefundReasonValue = (typeof REFUND_REASONS)[number]["value"];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
}

// ── Inner component ───────────────────────────────────────────────────────────

function OrderRefundButtonInner({ orderId, orderNumber, orderStatus }: Props) {
  // Only delivered orders are refund-eligible
  if (orderStatus !== "delivered") return null;

  const [open, setOpen]               = useState(false);
  const [reason, setReason]           = useState<RefundReasonValue | "">("");
  const [note, setNote]               = useState("");

  const isOtherReason = reason === "customer_request";
  const canSubmit =
    reason !== "" && (!isOtherReason || note.trim().length > 0);

  const refundMutation = useRequestRefund(orderId, orderNumber);

  function resetForm() {
    setReason("");
    setNote("");
    refundMutation.reset();
  }

  function handleOpenChange(next: boolean) {
    if (refundMutation.isPending) return;
    setOpen(next);
    if (!next) resetForm();
  }

  function handleSubmit() {
    if (!reason) return;

    const payload: RequestRefundInput = {
      reason,
      note: note.trim() || undefined,
      imageUrls: [],
    };

    refundMutation.mutate(payload, {
      onSuccess: () => {
        setOpen(false);
        resetForm();
        // Reload after toast so the status tracker reflects "refund_requested"
        setTimeout(() => {
          window.location.href = `/orders/${orderId}`;
        }, 2000);
      },
    });
  }

  const selectedHint = REFUND_REASONS.find(r => r.value === reason)?.hint;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {/* Trigger */}
      <AlertDialogTrigger
        render={
          <Button
            className="border-orange-200 text-orange-600 hover:border-orange-300 hover:bg-orange-50"
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
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Ajukan Refund
      </AlertDialogTrigger>

      {/* Dialog */}
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-orange-50">
            <svg
              className="h-6 w-6 text-orange-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </AlertDialogMedia>

          <AlertDialogTitle>
            Ajukan refund untuk{" "}
            <span className="font-mono">{orderNumber}</span>
          </AlertDialogTitle>

          <AlertDialogDescription>
            Permintaan refund akan ditinjau tim kami dalam{" "}
            <strong>3–5 hari kerja</strong>. Pastikan kamu memilih alasan yang
            tepat agar proses berjalan lebih cepat.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Reason selector */}
        <div className="space-y-2.5">
          <p className="text-sm font-medium text-gray-800">
            Alasan pengajuan refund{" "}
            <span aria-hidden="true" className="text-red-500">*</span>
          </p>

          <RadioGroup
            className="gap-2"
            onValueChange={val => setReason(val as RefundReasonValue)}
            value={reason}
          >
            {REFUND_REASONS.map(({ value, label }) => (
              <label
                className={`flex cursor-pointer select-none items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  reason === value
                    ? "border-orange-300 bg-orange-50 font-medium text-orange-800"
                    : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
                key={value}
              >
                <RadioGroupItem value={value} />
                {label}
              </label>
            ))}
          </RadioGroup>

          {/* Context hint */}
          {selectedHint && (
            <p className="text-xs text-gray-500 pl-1">{selectedHint}</p>
          )}
        </div>

        {/* Note */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700" htmlFor="refund-note">
            {isOtherReason ? (
              <>
                Ceritakan alasanmu{" "}
                <span aria-hidden="true" className="text-red-500">*</span>
              </>
            ) : (
              "Deskripsi masalah (opsional, tapi sangat membantu)"
            )}
          </Label>
          <Textarea
            id="refund-note"
            maxLength={900}
            onChange={e => setNote(e.target.value)}
            placeholder={
              isOtherReason
                ? "Jelaskan alasanmu mengajukan refund…"
                : "Jelaskan kondisi produk atau masalah yang kamu alami secara detail…"
            }
            rows={4}
            value={note}
          />
          <p className="text-right text-[10px] text-gray-400">
            {note.length}/900
          </p>
        </div>

        {/* Image upload notice */}
        <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <span>
            Jika ada bukti foto (produk rusak, paket salah), kamu bisa
            mengirimkannya melalui email ke{" "}
            <a className="font-medium underline underline-offset-2" href="mailto:support@my-ecommerce.com">
              support@my-ecommerce.com
            </a>{" "}
            dengan menyertakan nomor pesanan <strong>{orderNumber}</strong>.
          </span>
        </div>

        {/* Inline error */}
        {refundMutation.isError && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            {refundMutation.error instanceof Error
              ? refundMutation.error.message
              : "Gagal mengirim permintaan refund. Silakan coba lagi."}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={refundMutation.isPending}>
            Batal
          </AlertDialogCancel>

          <AlertDialogAction
            className="bg-orange-600 text-white hover:bg-orange-700"
            disabled={!canSubmit || refundMutation.isPending}
            onClick={handleSubmit}
            type="button"
          >
            {refundMutation.isPending ? (
              <>
                <svg
                  className="mr-1.5 h-3.5 w-3.5 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Mengirim…
              </>
            ) : (
              "Kirim permintaan refund"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Export with QueryClientProvider ──────────────────────────────────────────

export default function OrderRefundButton(props: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <OrderRefundButtonInner {...props} />
    </QueryClientProvider>
  );
}
