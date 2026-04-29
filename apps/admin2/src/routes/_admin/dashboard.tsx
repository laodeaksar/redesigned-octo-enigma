// =============================================================================
// Dashboard — KPI stats + revenue chart + top products + order status breakdown
// =============================================================================

import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, Tooltip, XAxis, YAxis,
  CartesianGrid, ResponsiveContainer,
} from "recharts";
import { ShoppingCart, TrendingUp, Package, Clock } from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { api } from "@/lib/api";
import { formatIDR, formatDate, ORDER_STATUS_LABELS } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/dashboard")({ component: DashboardPage });

interface Summary {
  today:   { orders: number; revenue: number; avgOrderValue: number };
  week:    { orders: number; revenue: number; avgOrderValue: number };
  month:   { orders: number; revenue: number; avgOrderValue: number };
  allTime: { orders: number; revenue: number; avgOrderValue: number };
}
interface RevenueSeries  { date: string; revenue: number; orders: number; }
interface StatusBreakdown { status: string; count: number; }
interface TopProduct {
  productId: string; name: string; imageUrl: string | null;
  totalQty: number; totalRevenue: number; orderCount: number;
}

const STATUS_PIE_COLORS: Record<string, string> = {
  pending_payment: "#f59e0b", processing: "#3b82f6", shipped: "#8b5cf6",
  delivered: "#14b8a6", completed: "#22c55e", cancelled: "#ef4444",
  refund_requested: "#f97316", refunded: "#6b7280",
};

function DashboardPage() {
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");

  const { data: summary } = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => api.get<{ success: true; data: Summary }>("/analytics/summary"),
    staleTime: 2 * 60_000,
  });
  const { data: revenueData } = useQuery({
    queryKey: ["analytics", "revenue", period],
    queryFn: () => api.get<{ success: true; data: RevenueSeries[] }>("/analytics/revenue", { params: { days: period } }),
    staleTime: 5 * 60_000,
  });
  const { data: statusData } = useQuery({
    queryKey: ["analytics", "order-statuses"],
    queryFn: () => api.get<{ success: true; data: StatusBreakdown[] }>("/analytics/order-statuses"),
    staleTime: 5 * 60_000,
  });
  const { data: topData } = useQuery({
    queryKey: ["analytics", "top-products", period],
    queryFn: () => api.get<{ success: true; data: TopProduct[] }>("/analytics/top-products", { params: { days: period, limit: "10" } }),
    staleTime: 5 * 60_000,
  });

  const s       = summary?.data;
  const revenue = revenueData?.data ?? [];
  const statuses = statusData?.data ?? [];
  const topProds = topData?.data    ?? [];

  const topCols: Column<TopProduct>[] = [
    {
      key: "name", header: "Produk",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.imageUrl
            ? <img src={row.imageUrl} alt={row.name} className="h-8 w-8 rounded object-cover shrink-0" />
            : <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-sm shrink-0">📦</div>}
          <span className="text-sm font-medium truncate max-w-[180px]">{row.name}</span>
        </div>
      ),
    },
    { key: "totalQty", header: "Terjual", sortable: true, cell: (row) => <span className="font-semibold">{row.totalQty} pcs</span> },
    { key: "totalRevenue", header: "Pendapatan", sortable: true, cell: (row) => <span className="font-semibold">{formatIDR(row.totalRevenue)}</span> },
    { key: "orderCount", header: "Order", cell: (row) => <span className="text-muted-foreground">{row.orderCount}</span> },
  ];

  const tooltipStyle = {
    background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
    borderRadius: "8px", fontSize: "12px",
  };

  return (
    <AdminLayout title="Dashboard" subtitle="Ringkasan performa toko">
      {/* Period selector */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Rentang Waktu</h2>
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {(["7", "30", "90"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 font-medium transition-colors ${period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              {p === "7" ? "7 Hari" : p === "30" ? "30 Hari" : "90 Hari"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pendapatan Bulan Ini"   value={formatIDR(s?.month.revenue ?? 0)}   icon={TrendingUp} description={`Rata-rata ${formatIDR(s?.month.avgOrderValue ?? 0)}/order`} />
        <StatCard title="Order Bulan Ini"        value={s?.month.orders ?? 0}                icon={ShoppingCart} />
        <StatCard title="Order Hari Ini"         value={s?.today.orders ?? 0}                icon={Clock}  description={formatIDR(s?.today.revenue ?? 0)} />
        <StatCard title="Total Semua Waktu"      value={formatIDR(s?.allTime.revenue ?? 0)}  icon={Package} description={`${s?.allTime.orders ?? 0} total order`} />
      </div>

      {/* Revenue chart + Status pie */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">Pendapatan Harian</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenue} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={(v: number) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}jt` : `${(v/1000).toFixed(0)}rb`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: number) => [formatIDR(v), "Pendapatan"]} labelFormatter={(l: string) => formatDate(l)} contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">Status Pesanan</h3>
          {statuses.length === 0 ? (
            <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">Tidak ada data</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statuses} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {statuses.map((e, i) => (
                      <Cell key={e.status} fill={STATUS_PIE_COLORS[e.status] ?? `hsl(${i*45} 60% 55%)`} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [v, ORDER_STATUS_LABELS[name] ?? name]} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1">
                {statuses.slice(0, 6).map((s, i) => (
                  <li key={s.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: STATUS_PIE_COLORS[s.status] ?? `hsl(${i*45} 60% 55%)` }} />
                      <span className="text-muted-foreground">{ORDER_STATUS_LABELS[s.status] ?? s.status}</span>
                    </div>
                    <span className="font-semibold">{s.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Daily order bar chart */}
      <div className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold">Jumlah Order Harian</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={revenue} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => [v, "Order"]} labelFormatter={(l: string) => formatDate(l)} contentStyle={tooltipStyle} />
            <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top products */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Produk Terlaris ({period} hari)</h3>
          <Link to="/_admin/products/" className="text-sm text-primary hover:underline">Lihat semua →</Link>
        </div>
        <DataTable columns={topCols} data={topProds} emptyMessage="Belum ada data penjualan" getRowKey={(r) => r.productId} />
      </div>
    </AdminLayout>
  );
}

