// =============================================================================
// Dashboard — KPI stats + revenue chart + top products + order status breakdown
// =============================================================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Package, ShoppingCart, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "@/lib/api";
import { formatDate, formatIDR, ORDER_STATUS_LABELS } from "@/lib/utils";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";

export const Route = createFileRoute("/_admin/dashboard")({
  component: DashboardPage,
});

interface Summary {
  allTime: { orders: number; revenue: number; avgOrderValue: number };
  month: { orders: number; revenue: number; avgOrderValue: number };
  today: { orders: number; revenue: number; avgOrderValue: number };
  week: { orders: number; revenue: number; avgOrderValue: number };
}
interface RevenueSeries {
  date: string;
  orders: number;
  revenue: number;
}
interface StatusBreakdown {
  count: number;
  status: string;
}
interface TopProduct {
  imageUrl: string | null;
  name: string;
  orderCount: number;
  productId: string;
  totalQty: number;
  totalRevenue: number;
}

const STATUS_PIE_COLORS: Record<string, string> = {
  pending_payment: "#f59e0b",
  processing: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#14b8a6",
  completed: "#22c55e",
  cancelled: "#ef4444",
  refund_requested: "#f97316",
  refunded: "#6b7280",
};

function DashboardPage() {
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");

  const { data: summary } = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () =>
      api.get<{ success: true; data: Summary }>("/analytics/summary"),
    staleTime: 2 * 60_000,
  });
  const { data: revenueData } = useQuery({
    queryKey: ["analytics", "revenue", period],
    queryFn: () =>
      api.get<{ success: true; data: RevenueSeries[] }>("/analytics/revenue", {
        params: { days: period },
      }),
    staleTime: 5 * 60_000,
  });
  const { data: statusData } = useQuery({
    queryKey: ["analytics", "order-statuses"],
    queryFn: () =>
      api.get<{ success: true; data: StatusBreakdown[] }>(
        "/analytics/order-statuses"
      ),
    staleTime: 5 * 60_000,
  });
  const { data: topData } = useQuery({
    queryKey: ["analytics", "top-products", period],
    queryFn: () =>
      api.get<{ success: true; data: TopProduct[] }>(
        "/analytics/top-products",
        { params: { days: period, limit: "10" } }
      ),
    staleTime: 5 * 60_000,
  });

  const s = summary?.data;
  const revenue = revenueData?.data ?? [];
  const statuses = statusData?.data ?? [];
  const topProds = topData?.data ?? [];

  const topCols: Column<TopProduct>[] = [
    {
      key: "name",
      header: "Produk",
      cell: row => (
        <div className="flex items-center gap-2">
          {row.imageUrl ? (
            <img
              alt={row.name}
              className="h-8 w-8 shrink-0 rounded object-cover"
              src={row.imageUrl}
            />
          ) : (
            <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded text-sm">
              📦
            </div>
          )}
          <span className="max-w-[180px] truncate text-sm font-medium">
            {row.name}
          </span>
        </div>
      ),
    },
    {
      key: "totalQty",
      header: "Terjual",
      sortable: true,
      cell: row => <span className="font-semibold">{row.totalQty} pcs</span>,
    },
    {
      key: "totalRevenue",
      header: "Pendapatan",
      sortable: true,
      cell: row => (
        <span className="font-semibold">{formatIDR(row.totalRevenue)}</span>
      ),
    },
    {
      key: "orderCount",
      header: "Order",
      cell: row => (
        <span className="text-muted-foreground">{row.orderCount}</span>
      ),
    },
  ];

  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  };

  return (
    <AdminLayout subtitle="Ringkasan performa toko" title="Dashboard">
      {/* Period selector */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-muted-foreground text-sm font-semibold">
          Rentang Waktu
        </h2>
        <div className="border-border flex overflow-hidden rounded-lg border text-sm">
          {(["7", "30", "90"] as const).map(p => (
            <button
              className={`px-4 py-1.5 font-medium transition-colors ${period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              key={p}
              onClick={() => setPeriod(p)}
            >
              {p === "7" ? "7 Hari" : p === "30" ? "30 Hari" : "90 Hari"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          description={`Rata-rata ${formatIDR(s?.month.avgOrderValue ?? 0)}/order`}
          icon={TrendingUp}
          title="Pendapatan Bulan Ini"
          value={formatIDR(s?.month.revenue ?? 0)}
        />
        <StatCard
          icon={ShoppingCart}
          title="Order Bulan Ini"
          value={s?.month.orders ?? 0}
        />
        <StatCard
          description={formatIDR(s?.today.revenue ?? 0)}
          icon={Clock}
          title="Order Hari Ini"
          value={s?.today.orders ?? 0}
        />
        <StatCard
          description={`${s?.allTime.orders ?? 0} total order`}
          icon={Package}
          title="Total Semua Waktu"
          value={formatIDR(s?.allTime.revenue ?? 0)}
        />
      </div>

      {/* Revenue chart + Status pie */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="border-border bg-card rounded-lg border p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Pendapatan Harian</h3>
          <ResponsiveContainer height={240} width="100%">
            <AreaChart
              data={revenue}
              margin={{ top: 0, right: 4, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) =>
                  v >= 1_000_000
                    ? `${(v / 1_000_000).toFixed(1)}jt`
                    : `${(v / 1000).toFixed(0)}rb`
                }
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [formatIDR(v), "Pendapatan"]}
                labelFormatter={(l: string) => formatDate(l)}
              />
              <Area
                dataKey="revenue"
                fill="url(#grad)"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="border-border bg-card rounded-lg border p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">Status Pesanan</h3>
          {statuses.length === 0 ? (
            <p className="text-muted-foreground flex h-48 items-center justify-center text-sm">
              Tidak ada data
            </p>
          ) : (
            <>
              <ResponsiveContainer height={180} width="100%">
                <PieChart>
                  <Pie
                    cx="50%"
                    cy="50%"
                    data={statuses}
                    dataKey="count"
                    innerRadius={50}
                    nameKey="status"
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {statuses.map((e, i) => (
                      <Cell
                        fill={
                          STATUS_PIE_COLORS[e.status] ??
                          `hsl(${i * 45} 60% 55%)`
                        }
                        key={e.status}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, name: string) => [
                      v,
                      ORDER_STATUS_LABELS[name] ?? name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1">
                {statuses.slice(0, 6).map((s, i) => (
                  <li
                    className="flex items-center justify-between text-xs"
                    key={s.status}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          background:
                            STATUS_PIE_COLORS[s.status] ??
                            `hsl(${i * 45} 60% 55%)`,
                        }}
                      />
                      <span className="text-muted-foreground">
                        {ORDER_STATUS_LABELS[s.status] ?? s.status}
                      </span>
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
      <div className="border-border bg-card mb-6 rounded-lg border p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold">Jumlah Order Harian</h3>
        <ResponsiveContainer height={160} width="100%">
          <BarChart
            data={revenue}
            margin={{ top: 0, right: 4, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number) => [v, "Order"]}
              labelFormatter={(l: string) => formatDate(l)}
            />
            <Bar
              dataKey="orders"
              fill="hsl(var(--primary))"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top products */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">
            Produk Terlaris ({period} hari)
          </h3>
          <Link
            className="text-primary text-sm hover:underline"
            to="/_admin/products/"
          >
            Lihat semua →
          </Link>
        </div>
        <DataTable
          columns={topCols}
          data={topProds}
          emptyMessage="Belum ada data penjualan"
          getRowKey={r => r.productId}
        />
      </div>
    </AdminLayout>
  );
}
