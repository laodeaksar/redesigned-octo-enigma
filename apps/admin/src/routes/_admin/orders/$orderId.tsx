// =============================================================================
// Order detail — status management with @repo/ui components
// =============================================================================

import { useState } from "react";
import type React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Package,
  Truck,
  XCircle,
} from "lucide-react";

import { api, type ApiResponse } from "@/lib/api";
import { cn, formatDateTime, formatIDR, ORDER_STATUS_LABELS } from "@/lib/utils";
import { CANCELLATION_REASONS, orderKeys, OrderStatusBadge } from "@/lib/orders";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/shared/page-header";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";

export const Route = createFileRoute("/_admin/orders/$orderId")({
  component: OrderDetailPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderDetail {
  cancellationNote: string | null;
  cancellationReason: string | null;
  createdAt: string;
  expiresAt: string;
  id: string;
  items: Array<{
    product: {
      productId: string;
      variantId: string;
      name: string;
      variantName: string;
      sku: string;
      imageUrl: string | null;
      price: number;
    };
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  orderNumber: string;
  paymentId: string | null;
  pricing: {
    subtotal: number;
    shippingCost: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
  };
  shipping: {
    courier: string;
    service: string;
    trackingNumber: string | null;
    estimatedDays: number;
    cost: number;
    address: {
      recipientName: string;
      phone: string;
      street: string;
      city: string;
      province: string;
      postalCode: string;
      country: string;
    };
    shippedAt: string | null;
    deliveredAt: string | null;
  };
  status: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    note: string | null;
    actorId: string | null;
  }>;
  updatedAt: string;
  userId: string;
}

// ── Status action config ──────────────────────────────────────────────────────

const NEXT_STATUS: Record<
  string,
  { value: string; label: string; icon: React.ElementType; variant: "default" | "destructive" }[]
> = {
  processing: [
    { value: "shipped",   label: "Tandai Dikirim",     icon: Truck,        variant: "default" },
    { value: "cancelled", label: "Batalkan Pesanan",   icon: XCircle,      variant: "destructive" },
  ],
  shipped: [
    { value: "delivered", label: "Tandai Terkirim",    icon: CheckCircle2, variant: "default" },
  ],
  delivered: [
    { value: "completed", label: "Selesaikan Pesanan", icon: CheckCircle2, variant: "default" },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const queryClient  = useQueryClient();

  const [trackingNumber, setTrackingNumber] = useState("");
  const [statusNote, setStatusNote]         = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason]         = useState(CANCELLATION_REASONS[0].value);
  const [cancelNote, setCancelNote]             = useState("");

  const { data, isLoading } = useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => api.get<ApiResponse<OrderDetail>>(`/orders/${orderId}`),
  });

  const statusMutation = useMutation({
    mutationFn: (payload: {
      status: string;
      note?: string;
      trackingNumber?: string;
      cancellationReason?: string;
    }) => api.patch(`/orders/${orderId}/status`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      void queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
      setTrackingNumber("");
      setStatusNote("");
      setCancelDialogOpen(false);
      setCancelReason(CANCELLATION_REASONS[0].value);
      setCancelNote("");
    },
  });

  const order        = data?.data;
  const nextStatuses = order ? (NEXT_STATUS[order.status] ?? []) : [];

  if (isLoading) {
    return (
      <AdminLayout title="Pesanan">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout title="Pesanan">
        <p className="text-muted-foreground">Pesanan tidak ditemukan.</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Detail Pesanan">
      <PageHeader
        actions={<OrderStatusBadge status={order.status} />}
        breadcrumbs={[
          { label: "Pesanan", href: "/_admin/orders/" },
          { label: order.orderNumber },
        ]}
        title={order.orderNumber}
      />

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Left col: items + shipping + cancellation info ─────────── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Order items */}
          <SectionCard icon={Package} title="Item Pesanan">
            <div className="divide-border divide-y">
              {order.items.map((item, i) => (
                <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={i}>
                  {item.product.imageUrl ? (
                    <img
                      alt={item.product.name}
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                      src={item.product.imageUrl}
                    />
                  ) : (
                    <div className="bg-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-md">
                      <Package className="text-muted-foreground h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-medium">
                      {item.product.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {item.product.variantName} · SKU: {item.product.sku}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">{formatIDR(item.subtotal)}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatIDR(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing summary */}
            <div className="border-border mt-4 space-y-1.5 border-t pt-4 text-sm">
              <PricingRow label="Subtotal"  value={formatIDR(order.pricing.subtotal)} />
              {order.pricing.discountTotal > 0 && (
                <PricingRow
                  className="text-green-600"
                  label="Diskon"
                  value={`- ${formatIDR(order.pricing.discountTotal)}`}
                />
              )}
              <PricingRow label="Ongkir"    value={formatIDR(order.pricing.shippingCost)} />
              {order.pricing.taxTotal > 0 && (
                <PricingRow label="Pajak"   value={formatIDR(order.pricing.taxTotal)} />
              )}
              <PricingRow
                className="border-border border-t pt-2 text-base font-bold"
                label="Total"
                value={formatIDR(order.pricing.grandTotal)}
              />
            </div>
          </SectionCard>

          {/* Shipping */}
          <SectionCard icon={Truck} title="Pengiriman">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">Alamat</p>
                <address className="text-foreground text-sm not-italic leading-relaxed">
                  <strong>{order.shipping.address.recipientName}</strong><br />
                  {order.shipping.address.phone}<br />
                  {order.shipping.address.street}<br />
                  {order.shipping.address.city}, {order.shipping.address.province}{" "}
                  {order.shipping.address.postalCode}
                </address>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">Kurir</p>
                <p className="text-foreground text-sm font-semibold">
                  {order.shipping.courier.toUpperCase()} {order.shipping.service}
                </p>
                {order.shipping.estimatedDays > 0 && (
                  <p className="text-muted-foreground text-xs">
                    Estimasi {order.shipping.estimatedDays} hari
                  </p>
                )}
                {order.shipping.trackingNumber && (
                  <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
                    <p className="text-xs font-semibold text-indigo-500">Nomor Resi</p>
                    <p className="font-mono text-sm font-bold text-indigo-900">
                      {order.shipping.trackingNumber}
                    </p>
                  </div>
                )}
                {order.shipping.shippedAt && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    📤 Dikirim: {formatDateTime(order.shipping.shippedAt)}
                  </p>
                )}
                {order.shipping.deliveredAt && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    📬 Diterima: {formatDateTime(order.shipping.deliveredAt)}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Cancellation info */}
          {order.cancellationReason && (
            <SectionCard icon={XCircle} title="Info Pembatalan">
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Alasan:</span>
                  <Badge className="text-xs" variant="destructive">
                    {CANCELLATION_REASONS.find(r => r.value === order.cancellationReason)?.label
                      ?? order.cancellationReason}
                  </Badge>
                </div>
                {order.cancellationNote && (
                  <p className="text-muted-foreground italic">"{order.cancellationNote}"</p>
                )}
              </div>
            </SectionCard>
          )}
        </div>

        {/* ── Right col: actions + timeline + payment ─────────────────── */}
        <div className="space-y-6">

          {/* Status actions */}
          {nextStatuses.length > 0 && (
            <SectionCard title="Ubah Status">
              <div className="space-y-3">
                {nextStatuses.some(ns => ns.value === "shipped") && (
                  <div>
                    <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                      No. Resi<span className="text-destructive ml-0.5">*</span>
                    </label>
                    <Input
                      onChange={e => setTrackingNumber(e.target.value)}
                      placeholder="cth. JNE123456789"
                      value={trackingNumber}
                    />
                  </div>
                )}

                {nextStatuses.some(ns => ns.value !== "cancelled") && (
                  <div>
                    <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                      Catatan (opsional)
                    </label>
                    <Input
                      onChange={e => setStatusNote(e.target.value)}
                      placeholder="Catatan perubahan status"
                      value={statusNote}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  {nextStatuses.map(ns => {
                    const Icon     = ns.icon;
                    const isShip   = ns.value === "shipped";
                    const isCancel = ns.value === "cancelled";

                    if (isCancel) {
                      return (
                        <Button
                          className="w-full"
                          key={ns.value}
                          onClick={() => setCancelDialogOpen(true)}
                          variant="destructive"
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {ns.label}
                        </Button>
                      );
                    }

                    return (
                      <Button
                        className="w-full"
                        disabled={
                          statusMutation.isPending ||
                          (isShip && !trackingNumber.trim())
                        }
                        key={ns.value}
                        onClick={() =>
                          statusMutation.mutate({
                            status: ns.value,
                            note: statusNote || undefined,
                            trackingNumber: isShip ? trackingNumber : undefined,
                          })
                        }
                        variant={ns.variant}
                      >
                        {statusMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Icon className="mr-2 h-4 w-4" />
                        )}
                        {ns.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </SectionCard>
          )}

          {/* Status history timeline */}
          <SectionCard icon={Clock} title="Riwayat Status">
            <ol className="space-y-3">
              {[...order.statusHistory].reverse().map((event, i) => (
                <li className="flex gap-3" key={i}>
                  <div className="bg-primary/10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        i === 0 ? "bg-primary" : "bg-muted-foreground/40"
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={cn("text-xs", i !== 0 && "opacity-70")}
                        variant="outline"
                      >
                        {ORDER_STATUS_LABELS[event.status] ?? event.status}
                      </Badge>
                      {i === 0 && (
                        <Badge className="text-xs" variant="default">
                          Saat ini
                        </Badge>
                      )}
                    </div>
                    {event.note && (
                      <p className="text-muted-foreground mt-0.5 text-xs italic">
                        "{event.note}"
                      </p>
                    )}
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatDateTime(event.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>

          {/* Payment */}
          <SectionCard icon={CreditCard} title="Pembayaran">
            {order.paymentId ? (
              <p className="text-foreground break-all font-mono text-sm">
                {order.paymentId}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                {order.status === "pending_payment"
                  ? `Menunggu pembayaran hingga ${formatDateTime(order.expiresAt)}`
                  : "Belum ada data pembayaran"}
              </p>
            )}
          </SectionCard>
        </div>
      </div>

      {/* ── Cancellation confirmation dialog ──────────────────────────────── */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Pesanan</DialogTitle>
          </DialogHeader>

          <p className="text-muted-foreground text-sm">
            Pesanan{" "}
            <strong className="text-foreground font-mono">{order.orderNumber}</strong>{" "}
            akan dibatalkan. Aksi ini tidak dapat diurungkan.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                Alasan Pembatalan
                <span className="text-destructive ml-0.5">*</span>
              </label>
              <select
                className="border-input bg-background focus:ring-ring h-8 w-full rounded-lg border px-2.5 text-sm focus:outline-none focus:ring-2"
                onChange={e => setCancelReason(e.target.value)}
                value={cancelReason}
              >
                {CANCELLATION_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                Catatan (opsional)
              </label>
              <Input
                onChange={e => setCancelNote(e.target.value)}
                placeholder="Detail tambahan jika diperlukan"
                value={cancelNote}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setCancelDialogOpen(false)} variant="outline">
              Kembali
            </Button>
            <Button
              disabled={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({
                  status: "cancelled",
                  cancellationReason: cancelReason,
                  note: cancelNote || undefined,
                })
              }
              variant="destructive"
            >
              {statusMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses…
                </>
              ) : (
                "Batalkan Pesanan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// ── Small helper components ────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card rounded-lg border p-5 shadow-sm">
      <h3 className="text-foreground mb-4 flex items-center gap-2 text-sm font-semibold">
        {Icon && <Icon className="text-muted-foreground h-4 w-4" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

function PricingRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
