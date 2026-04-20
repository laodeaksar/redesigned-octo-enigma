// =============================================================================
// Order detail page
// =============================================================================

import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Package,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { api, type ApiResponse } from "@/lib/api";
import {
  formatIDR,
  formatDateTime,
  ORDER_STATUS_LABELS,
} from "@/lib/utils";
import { cn } from "@/lib/utils";
import { OrderStatusBadge, orderKeys } from "./index";

export const Route = createFileRoute("/_admin/orders/$orderId")({
  component: OrderDetailPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderDetail {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
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
  pricing: {
    subtotal: number;
    shippingCost: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
  };
  paymentId: string | null;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    note: string | null;
    actorId: string | null;
  }>;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

// ── Status transitions ────────────────────────────────────────────────────────

const NEXT_STATUS: Record<string, { value: string; label: string; icon: React.ElementType }[]> = {
  processing: [
    { value: "shipped", label: "Tandai Dikirim", icon: Truck },
    { value: "cancelled", label: "Batalkan", icon: XCircle },
  ],
  shipped: [
    { value: "delivered", label: "Tandai Terkirim", icon: CheckCircle2 },
  ],
  delivered: [
    { value: "completed", label: "Selesaikan", icon: CheckCircle2 },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const queryClient = useQueryClient();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () =>
      api.get<ApiResponse<OrderDetail>>(`/orders/${orderId}`),
  });

  const statusMutation = useMutation({
    mutationFn: (payload: {
      status: string;
      note?: string;
      trackingNumber?: string;
    }) => api.patch(`/orders/${orderId}/status`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
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
        title={order.orderNumber}
        breadcrumbs={[
          { label: "Pesanan", href: "/_admin/orders/" },
          { label: order.orderNumber },
        ]}
        actions={<OrderStatusBadge status={order.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left — items + shipping */}
        <div className="space-y-6 lg:col-span-2">

          {/* Order items */}
          <Card title="Item Pesanan" icon={Package}>
            <div className="divide-y divide-border">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="h-12 w-12 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.product.variantName} · SKU: {item.product.sku}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatIDR(item.subtotal)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatIDR(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing summary */}
            <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
              <Row label="Subtotal" value={formatIDR(order.pricing.subtotal)} />
              {order.pricing.discountTotal > 0 && (
                <Row label="Diskon" value={`- ${formatIDR(order.pricing.discountTotal)}`} className="text-green-600" />
              )}
              <Row label="Ongkir" value={formatIDR(order.pricing.shippingCost)} />
              {order.pricing.taxTotal > 0 && (
                <Row label="Pajak" value={formatIDR(order.pricing.taxTotal)} />
              )}
              <Row
                label="Total"
                value={formatIDR(order.pricing.grandTotal)}
                className="border-t border-border pt-2 font-bold text-base"
              />
            </div>
          </Card>

          {/* Shipping info */}
          <Card title="Pengiriman" icon={Truck}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Alamat</p>
                <address className="text-sm not-italic leading-relaxed text-foreground">
                  <strong>{order.shipping.address.recipientName}</strong>
                  <br />{order.shipping.address.phone}
                  <br />{order.shipping.address.street}
                  <br />
                  {order.shipping.address.city}, {order.shipping.address.province}{" "}
                  {order.shipping.address.postalCode}
                </address>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Kurir</p>
                <p className="text-sm font-semibold text-foreground">
                  {order.shipping.courier.toUpperCase()} {order.shipping.service}
                </p>
                {order.shipping.trackingNumber && (
                  <p className="mt-1 font-mono text-sm text-primary">
                    {order.shipping.trackingNumber}
                  </p>
                )}
                {order.shipping.shippedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
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
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      No. Resi (wajib untuk pengiriman)
                    </label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="cth. JNE123456789"
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Catatan (opsional)
                  </label>
                  <input
                    type="text"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Catatan perubahan status"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  {nextStatuses.map((ns) => {
                    const Icon = ns.icon;
                    const isShip = ns.value === "shipped";
                    return (
                      <button
                        key={ns.value}
                        onClick={() =>
                          statusMutation.mutate({
                            status: ns.value,
                            note: statusNote || undefined,
                            trackingNumber: isShip ? trackingNumber : undefined,
                          })
                        }
                        disabled={
                          statusMutation.isPending ||
                          (isShip && !trackingNumber)
                        }
                        className={cn(
                          "flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                          ns.value === "cancelled"
                            ? "border border-destructive text-destructive hover:bg-destructive/10"
                            : "bg-primary text-primary-foreground hover:opacity-90"
                        )}
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
          <Card title="Riwayat Status" icon={Clock}>
            <ol className="space-y-3">
              {[...order.statusHistory].reverse().map((event, i) => (
                <li key={i} className="flex gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      i === 0 ? "bg-primary" : "bg-muted-foreground/40"
                    )} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {ORDER_STATUS_LABELS[event.status] ?? event.status}
                    </p>
                    {event.note && (
                      <p className="text-xs text-muted-foreground">{event.note}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(event.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {/* Payment */}
          <Card title="Pembayaran" icon={CreditCard}>
            {order.paymentId ? (
              <p className="text-sm text-foreground font-mono">{order.paymentId}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
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
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
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
