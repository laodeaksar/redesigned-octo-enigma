// =============================================================================
// Order detail page
// =============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Package,
  Truck,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { type ApiResponse, api } from "@/lib/api";
import {
  cn,
  formatDateTime,
  formatIDR,
  ORDER_STATUS_LABELS,
} from "@/lib/utils";
import { OrderStatusBadge, orderKeys } from "./index";

export const Route = createFileRoute("/_admin/orders/$orderId")({
  component: OrderDetailPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderDetail {
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

// ── Status transitions ────────────────────────────────────────────────────────

const NEXT_STATUS: Record<
  string,
  { value: string; label: string; icon: React.ElementType }[]
> = {
  processing: [
    { value: "shipped", label: "Tandai Dikirim", icon: Truck },
    { value: "cancelled", label: "Batalkan", icon: XCircle },
  ],
  shipped: [
    { value: "delivered", label: "Tandai Terkirim", icon: CheckCircle2 },
  ],
  delivered: [{ value: "completed", label: "Selesaikan", icon: CheckCircle2 }],
};

// ── Component ─────────────────────────────────────────────────────────────────

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const queryClient = useQueryClient();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => api.get<ApiResponse<OrderDetail>>(`/orders/${orderId}`),
  });

  const statusMutation = useMutation({
    mutationFn: (payload: {
      status: string;
      note?: string;
      trackingNumber?: string;
    }) => api.patch(`/orders/${orderId}/status`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: orderKeys.detail(orderId),
      });
      void queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
      setTrackingNumber("");
      setStatusNote("");
    },
  });

  const order = data?.data;
  const nextStatuses = order ? (NEXT_STATUS[order.status] ?? []) : [];

  if (isLoading) {
    return (
      <AdminLayout title="Pesanan">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
        {/* Left — items + shipping */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order items */}
          <Card icon={Package} title="Item Pesanan">
            <div className="divide-y divide-border">
              {order.items.map((item, i) => (
                <div
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  key={i}
                >
                  {item.product.imageUrl ? (
                    <img
                      alt={item.product.name}
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                      src={item.product.imageUrl}
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground text-sm">
                      {item.product.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {item.product.variantName} · SKU: {item.product.sku}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-sm">
                      {formatIDR(item.subtotal)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatIDR(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing summary */}
            <div className="mt-4 space-y-1.5 border-border border-t pt-4 text-sm">
              <Row label="Subtotal" value={formatIDR(order.pricing.subtotal)} />
              {order.pricing.discountTotal > 0 && (
                <Row
                  className="text-green-600"
                  label="Diskon"
                  value={`- ${formatIDR(order.pricing.discountTotal)}`}
                />
              )}
              <Row
                label="Ongkir"
                value={formatIDR(order.pricing.shippingCost)}
              />
              {order.pricing.taxTotal > 0 && (
                <Row label="Pajak" value={formatIDR(order.pricing.taxTotal)} />
              )}
              <Row
                className="border-border border-t pt-2 font-bold text-base"
                label="Total"
                value={formatIDR(order.pricing.grandTotal)}
              />
            </div>
          </Card>

          {/* Shipping info */}
          <Card icon={Truck} title="Pengiriman">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 font-medium text-muted-foreground text-xs uppercase">
                  Alamat
                </p>
                <address className="text-foreground text-sm not-italic leading-relaxed">
                  <strong>{order.shipping.address.recipientName}</strong>
                  <br />
                  {order.shipping.address.phone}
                  <br />
                  {order.shipping.address.street}
                  <br />
                  {order.shipping.address.city},{" "}
                  {order.shipping.address.province}{" "}
                  {order.shipping.address.postalCode}
                </address>
              </div>
              <div>
                <p className="mb-1 font-medium text-muted-foreground text-xs uppercase">
                  Kurir
                </p>
                <p className="font-semibold text-foreground text-sm">
                  {order.shipping.courier.toUpperCase()}{" "}
                  {order.shipping.service}
                </p>
                {order.shipping.trackingNumber && (
                  <p className="mt-1 font-mono text-primary text-sm">
                    {order.shipping.trackingNumber}
                  </p>
                )}
                {order.shipping.shippedAt && (
                  <p className="mt-1 text-muted-foreground text-xs">
                    Dikirim: {formatDateTime(order.shipping.shippedAt)}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right — actions + timeline */}
        <div className="space-y-6">
          {/* Actions */}
          {nextStatuses.length > 0 && (
            <Card title="Ubah Status">
              <div className="space-y-3">
                {nextStatuses[0]?.value === "shipped" && (
                  <div>
                    <label className="mb-1 block font-medium text-muted-foreground text-xs">
                      No. Resi (wajib untuk pengiriman)
                    </label>
                    <input
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="cth. JNE123456789"
                      type="text"
                      value={trackingNumber}
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block font-medium text-muted-foreground text-xs">
                    Catatan (opsional)
                  </label>
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Catatan perubahan status"
                    type="text"
                    value={statusNote}
                  />
                </div>

                <div className="space-y-2">
                  {nextStatuses.map((ns) => {
                    const Icon = ns.icon;
                    const isShip = ns.value === "shipped";
                    return (
                      <button
                        className={cn(
                          "flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 font-medium text-sm transition-opacity",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                          ns.value === "cancelled"
                            ? "border border-destructive text-destructive hover:bg-destructive/10"
                            : "bg-primary text-primary-foreground hover:opacity-90"
                        )}
                        disabled={
                          statusMutation.isPending ||
                          (isShip && !trackingNumber)
                        }
                        key={ns.value}
                        onClick={() =>
                          statusMutation.mutate({
                            status: ns.value,
                            note: statusNote || undefined,
                            trackingNumber: isShip ? trackingNumber : undefined,
                          })
                        }
                      >
                        <Icon className="h-4 w-4" />
                        {ns.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Status timeline */}
          <Card icon={Clock} title="Riwayat Status">
            <ol className="space-y-3">
              {[...order.statusHistory].reverse().map((event, i) => (
                <li className="flex gap-3" key={i}>
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        i === 0 ? "bg-primary" : "bg-muted-foreground/40"
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm">
                      {ORDER_STATUS_LABELS[event.status] ?? event.status}
                    </p>
                    {event.note && (
                      <p className="text-muted-foreground text-xs">
                        {event.note}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(event.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {/* Payment */}
          <Card icon={CreditCard} title="Pembayaran">
            {order.paymentId ? (
              <p className="font-mono text-foreground text-sm">
                {order.paymentId}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                {order.status === "pending_payment"
                  ? `Menunggu pembayaran hingga ${formatDateTime(order.expiresAt)}`
                  : "Belum ada data pembayaran"}
              </p>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground text-sm">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({
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
