// =============================================================================
// Dashboard page
// =============================================================================

import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { api, type PaginatedResponse } from "@/lib/api";
import {
  formatIDR,
  formatDateTime,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@/lib/utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/dashboard")({
  component: DashboardPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecentOrder {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  itemCount: number;
  grandTotal: number;
  createdAt: string;
}

// ── Query keys ────────────────────────────────────────────────────────────────

const dashboardKeys = {
  recentOrders: ["dashboard", "recent-orders"] as const,
};

// ── Component ─────────────────────────────────────────────────────────────────

function DashboardPage() {
  const { data: ordersData, isLoading } = useQuery({
    queryKey: dashboardKeys.recentOrders,
    queryFn: () =>
      api.get<PaginatedResponse<RecentOrder>>("/orders", {
        params: { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" },
      }),
  });

  const orders = ordersData?.data ?? [];

  // ── Stats (computed from recent data as placeholder) ──────────────────────
  const stats = {
    totalOrders: ordersData?.meta.total ?? 0,
    pendingOrders: orders.filter((o) => o.status === "pending_payment").length,
    processingOrders: orders.filter((o) => o.status === "processing").length,
    revenue: orders.reduce((sum, o) => sum + o.grandTotal, 0),
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns: Column<RecentOrder>[] = [
    {
      key: "orderNumber",
      header: "No. Pesanan",
      cell: (row) => (
        <span className="font-mono text-xs font-medium text-foreground">
          {row.orderNumber}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "itemCount",
      header: "Item",
      cell: (row) => (
        <span className="text-muted-foreground">{row.itemCount} item</span>
      ),
    },
    {
      key: "grandTotal",
      header: "Total",
      cell: (row) => (
        <span className="font-medium">{formatIDR(row.grandTotal)}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Waktu",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout title="Dashboard" subtitle="Ringkasan aktivitas toko">
      {/* Stats grid */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Pesanan"
          value={stats.totalOrders}
          icon={ShoppingCart}
          trend={{ value: 12, label: "vs bulan lalu" }}
        />
        <StatCard
          title="Menunggu Bayar"
          value={stats.pendingOrders}
          icon={Clock}
          description="Perlu tindakan"
        />
        <StatCard
          title="Diproses"
          value={stats.processingOrders}
          icon={Package}
          trend={{ value: 5, label: "vs kemarin" }}
        />
        <StatCard
          title="Pendapatan (halaman ini)"
          value={formatIDR(stats.revenue)}
          icon={TrendingUp}
          trend={{ value: 8, label: "vs minggu lalu" }}
        />
      </div>

      {/* Recent orders */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">
            Pesanan Terbaru
          </h3>
          <a
            href="/_admin/orders/"
            className="text-sm text-primary hover:underline"
          >
            Lihat semua →
          </a>
        </div>
        <DataTable
          columns={columns}
          data={orders}
          isLoading={isLoading}
          emptyMessage="Belum ada pesanan"
          getRowKey={(row) => row.id}
        />
      </div>
    </AdminLayout>
  );
}

// ── Status badge component ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABELS[status] ?? status;
  const color = ORDER_STATUS_COLORS[status] ?? "default";

  const colorMap: Record<string, string> = {
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    destructive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    secondary: "bg-muted text-muted-foreground",
    default: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colorMap[color]
      )}
    >
      {label}
    </span>
  );
}

export { StatusBadge };

