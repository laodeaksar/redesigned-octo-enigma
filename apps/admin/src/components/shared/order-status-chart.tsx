// =============================================================================
// OrderStatusChart — bar chart of orders by status
// Accepts same StatusBreakdown[] data already fetched by OrderStatusSummary —
// no extra API call. Uses @repo/ui/components/chart (Recharts wrapper).
// =============================================================================

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";

import { cn, formatIDR, ORDER_STATUS_LABELS } from "@/lib/utils";
import { ALL_ORDER_STATUSES } from "@/lib/orders";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@repo/ui/components/chart";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StatusBreakdown {
  count: number;
  revenue: number;
  status: string;
}

type Metric = "count" | "revenue";

interface OrderStatusChartProps {
  activeStatus?: string;
  statuses: StatusBreakdown[];
  onStatusFilter?: (status: string) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_ALL = "__all__";

/** Hex fill per status — mirrors the Tailwind dot colours in the cards */
const STATUS_HEX: Record<string, string> = {
  pending_payment:  "#facc15",
  processing:       "#3b82f6",
  shipped:          "#6366f1",
  delivered:        "#14b8a6",
  completed:        "#22c55e",
  cancelled:        "#ef4444",
  refund_requested: "#f97316",
  refunded:         "#9ca3af",
};

/** Shortened X-axis labels so they fit without overlap */
const STATUS_SHORT: Record<string, string> = {
  pending_payment:  "Menunggu",
  processing:       "Diproses",
  shipped:          "Dikirim",
  delivered:        "Terkirim",
  completed:        "Selesai",
  cancelled:        "Dibatalkan",
  refund_requested: "Refund",
  refunded:         "Direfund",
};

const CHART_CONFIG: ChartConfig = {
  count:   { label: "Jumlah Pesanan" },
  revenue: { label: "Pendapatan"     },
};

// ── Custom tooltip ─────────────────────────────────────────────────────────────

interface TooltipPayload {
  payload: {
    status: string;
    label: string;
    count: number;
    revenue: number;
    fill: string;
  };
  value: number;
}

function StatusTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  metric: Metric;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  if (!d) return null;

  return (
    <div className="border-border/50 bg-background grid min-w-[130px] gap-1 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-[2px]"
          style={{ background: d.payload.fill }}
        />
        <span className="font-medium">{d.payload.label}</span>
      </div>
      <span className="text-muted-foreground font-mono tabular-nums">
        {metric === "revenue"
          ? formatIDR(d.value)
          : `${d.value.toLocaleString("id-ID")} pesanan`}
      </span>
    </div>
  );
}

// ── Custom Y-axis tick ────────────────────────────────────────────────────────

function compactNum(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}rb`;
  return String(n);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrderStatusChart({
  activeStatus = STATUS_ALL,
  statuses,
  onStatusFilter,
}: OrderStatusChartProps) {
  const [metric, setMetric] = useState<Metric>("count");

  // Build chart data in canonical status order; only keep statuses with data
  const chartData = ALL_ORDER_STATUSES
    .map(status => {
      const found = statuses.find(s => s.status === status);
      return {
        status,
        label:      ORDER_STATUS_LABELS[status] ?? status,
        shortLabel: STATUS_SHORT[status] ?? status,
        count:      found?.count   ?? 0,
        revenue:    found?.revenue ?? 0,
        fill:       STATUS_HEX[status] ?? "#94a3b8",
      };
    })
    .filter(d => d.count > 0 || d.revenue > 0);

  const isEmpty = chartData.length === 0;

  const handleBarClick = (data: { status: string }) => {
    if (!onStatusFilter) return;
    onStatusFilter(activeStatus === data.status ? STATUS_ALL : data.status);
  };

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium leading-tight">
          Distribusi Status Pesanan
        </CardTitle>

        {/* Metric toggle */}
        <div className="flex shrink-0 gap-1">
          <Button
            size="sm"
            variant={metric === "count" ? "default" : "ghost"}
            onClick={() => setMetric("count")}
            className="h-6 px-2 text-xs"
          >
            Jumlah
          </Button>
          <Button
            size="sm"
            variant={metric === "revenue" ? "default" : "ghost"}
            onClick={() => setMetric("revenue")}
            className="h-6 px-2 text-xs"
          >
            Pendapatan
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isEmpty ? (
          <div className="text-muted-foreground flex h-[180px] items-center justify-center text-sm">
            Belum ada data pesanan untuk periode ini
          </div>
        ) : (
          <ChartContainer config={CHART_CONFIG} className="h-[200px] w-full">
            <BarChart
              data={chartData}
              barCategoryGap="25%"
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid vertical={false} className="stroke-border/40" />

              <XAxis
                dataKey="shortLabel"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                interval={0}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                tickFormatter={compactNum}
                width={metric === "revenue" ? 48 : 28}
              />

              <ChartTooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                content={({ active, payload }) => (
                  <StatusTooltip
                    active={active}
                    payload={payload as TooltipPayload[]}
                    metric={metric}
                  />
                )}
              />

              <Bar
                dataKey={metric}
                radius={[4, 4, 0, 0]}
                cursor={onStatusFilter ? "pointer" : undefined}
                onClick={onStatusFilter ? handleBarClick : undefined}
              >
                {chartData.map(d => (
                  <Cell
                    key={d.status}
                    fill={d.fill}
                    className={cn(
                      "transition-opacity",
                      activeStatus !== STATUS_ALL && activeStatus !== d.status
                        ? "opacity-30"
                        : "opacity-100"
                    )}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
