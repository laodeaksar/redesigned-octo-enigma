// =============================================================================
// Analytics page — revenue & order-count trends with KPI cards
// Uses @repo/ui Card, Button, Skeleton, Separator throughout
// =============================================================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart2,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { api } from "@/lib/api";
import { cn, formatIDR } from "@/lib/utils";
import { AdminLayout } from "@/components/layout/admin-layout";
import { StatCard } from "@/components/shared/stat-card";
import {
  RevenueChart,
  type RevenueSeries,
} from "@/components/shared/revenue-chart";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@repo/ui/components/card";
import { Separator } from "@repo/ui/components/separator";
import { Skeleton } from "@repo/ui/components/skeleton";

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_admin/analytics")({
  component: AnalyticsPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Period = "7" | "30" | "90";

interface Summary {
  allTime: { orders: number; revenue: number; avgOrderValue: number };
  month:   { orders: number; revenue: number; avgOrderValue: number };
  today:   { orders: number; revenue: number; avgOrderValue: number };
  week:    { orders: number; revenue: number; avgOrderValue: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = {
  "7":  "7 Hari",
  "30": "30 Hari",
  "90": "90 Hari",
};

function compactIDR(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)         return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return formatIDR(n);
}

function derivePeriodKpis(data: RevenueSeries[]) {
  return data.reduce(
    (acc, d) => ({
      revenue:  acc.revenue  + d.revenue,
      orders:   acc.orders   + d.orders,
      activeDays: acc.activeDays + (d.revenue > 0 || d.orders > 0 ? 1 : 0),
    }),
    { revenue: 0, orders: 0, activeDays: 0 }
  );
}

// ── KPI skeleton ──────────────────────────────────────────────────────────────

function KpiSkeletons() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[106px] rounded-lg" />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30");

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: summaryRes, isLoading: summaryLoading } = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn:  () =>
      api.get<{ success: true; data: Summary }>("/analytics/summary"),
    staleTime: 5 * 60_000,
  });

  const { data: revenueRes, isFetching: revenueFetching } = useQuery({
    queryKey: ["analytics", "revenue", period],
    queryFn:  () =>
      api.get<{ success: true; data: RevenueSeries[] }>("/analytics/revenue", {
        params: { days: period },
      }),
    staleTime: 5 * 60_000,
  });

  // ── Derived values ─────────────────────────────────────────────────────────

  const s        = summaryRes?.data;
  const series   = revenueRes?.data ?? [];
  const kpi      = derivePeriodKpis(series);
  const avgDaily = kpi.activeDays > 0
    ? kpi.revenue / kpi.activeDays
    : 0;

  return (
    <AdminLayout
      title="Analitik"
      subtitle="Tren pendapatan dan jumlah order harian"
    >
      {/* ── Period selector ─────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Menampilkan data{" "}
          <span className="text-foreground font-medium">
            {PERIOD_LABELS[period]} terakhir
          </span>
        </p>

        <div className="flex gap-1 rounded-lg border p-0.5">
          {(["7", "30", "90"] as const).map(p => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "ghost"}
              onClick={() => setPeriod(p)}
              className={cn(
                "h-7 px-3 text-xs",
                period !== p && "text-muted-foreground"
              )}
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
        </div>
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        {summaryLoading ? (
          <KpiSkeletons />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Wallet}
              title={`Pendapatan ${PERIOD_LABELS[period]}`}
              value={compactIDR(kpi.revenue)}
              description={`Avg/hari: ${compactIDR(avgDaily)}`}
            />
            <StatCard
              icon={ShoppingCart}
              title={`Order ${PERIOD_LABELS[period]}`}
              value={kpi.orders.toLocaleString("id-ID")}
              description={
                kpi.orders > 0
                  ? `${compactIDR(kpi.revenue / kpi.orders)} avg per order`
                  : undefined
              }
            />
            <StatCard
              icon={TrendingUp}
              title="Pendapatan Bulan Ini"
              value={compactIDR(s?.month.revenue ?? 0)}
              description={`${s?.month.orders ?? 0} order`}
            />
            <StatCard
              icon={BarChart2}
              title="Semua Waktu"
              value={compactIDR(s?.allTime.revenue ?? 0)}
              description={`${(s?.allTime.orders ?? 0).toLocaleString("id-ID")} total order`}
            />
          </div>
        )}
      </div>

      {/* ── Revenue trend chart ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">
                Tren Pendapatan &amp; Order Harian
              </CardTitle>
              <CardDescription className="mt-0.5">
                {PERIOD_LABELS[period]} terakhir ·{" "}
                {series.length > 0
                  ? `${series.length} hari dengan aktivitas`
                  : "tidak ada transaksi"}
              </CardDescription>
            </div>

            {/* Period totals badge row */}
            {series.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-right text-xs">
                <span>
                  <span className="text-muted-foreground">Total pendapatan </span>
                  <span className="font-semibold tabular-nums">
                    {formatIDR(kpi.revenue)}
                  </span>
                </span>
                <span>
                  <span className="text-muted-foreground">Total order </span>
                  <span className="font-semibold tabular-nums">
                    {kpi.orders.toLocaleString("id-ID")}
                  </span>
                </span>
              </div>
            )}
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-4">
          <RevenueChart
            data={series}
            isLoading={revenueFetching && series.length === 0}
            periodDays={Number(period)}
          />
        </CardContent>
      </Card>

      {/* ── Daily breakdown table (top 10 highest-revenue days) ─────────── */}
      {series.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              10 Hari Tertinggi (Pendapatan)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-border divide-y">
              {[...series]
                .filter(d => d.revenue > 0)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 10)
                .map((d, i) => (
                  <div
                    key={d.date}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-5 text-right text-xs tabular-nums">
                        {i + 1}
                      </span>
                      <span>
                        {new Date(d.date).toLocaleDateString("id-ID", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <span className="text-muted-foreground text-xs">
                        {d.orders} order
                      </span>
                      <span className="min-w-[110px] font-semibold tabular-nums">
                        {formatIDR(d.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
