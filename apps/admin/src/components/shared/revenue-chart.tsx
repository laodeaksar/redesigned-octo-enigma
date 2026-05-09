// =============================================================================
// RevenueChart — daily revenue (area) + order count (line) trend
// Uses @repo/ui ChartContainer, ChartTooltip, ChartLegend + Recharts
// Dual Y-axis: revenue on left, order count on right
// =============================================================================

import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  XAxis,
  YAxis,
} from "recharts";

import { formatIDR } from "@/lib/utils";

import { Skeleton } from "@repo/ui/components/skeleton";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@repo/ui/components/chart";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RevenueSeries {
  date: string;     // "YYYY-MM-DD"
  revenue: number;
  orders: number;
}

interface RevenueChartProps {
  data: RevenueSeries[];
  isLoading?: boolean;
  periodDays: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const CHART_CONFIG: ChartConfig = {
  revenue: { label: "Pendapatan",    color: "#3b82f6" }, // blue-500
  orders:  { label: "Jumlah Order",  color: "#10b981" }, // emerald-500
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function compactIDR(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}rb`;
  return String(n);
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

interface TooltipEntry {
  dataKey: string;
  value: number;
  color: string;
}

function RevTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  const rev    = payload.find(p => p.dataKey === "revenue");
  const orders = payload.find(p => p.dataKey === "orders");

  return (
    <div className="border-border/50 bg-background grid min-w-[160px] gap-1.5 rounded-lg border px-2.5 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground font-medium">{longDate(label)}</p>
      <div className="grid gap-1">
        {rev && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-[2px]"
                style={{ background: rev.color }}
              />
              <span className="text-muted-foreground">Pendapatan</span>
            </span>
            <span className="font-mono font-medium tabular-nums">
              {formatIDR(rev.value)}
            </span>
          </div>
        )}
        {orders && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-0.5 shrink-0"
                style={{ background: orders.color }}
              />
              <span className="text-muted-foreground">Order</span>
            </span>
            <span className="font-mono font-medium tabular-nums">
              {orders.value.toLocaleString("id-ID")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RevenueChart({ data, isLoading, periodDays }: RevenueChartProps) {
  if (isLoading) {
    return <Skeleton className="h-[280px] w-full rounded-xl" />;
  }

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[280px] items-center justify-center text-sm">
        Belum ada data untuk periode ini
      </div>
    );
  }

  // Fill in missing dates so the X axis is continuous
  const filled = fillGaps(data, periodDays);

  // Derive tick interval so we don't over-crowd the X axis
  const tickInterval = filled.length <= 14 ? 0 : filled.length <= 31 ? 2 : 6;

  return (
    <ChartContainer config={CHART_CONFIG} className="h-[280px] w-full">
      <ComposedChart
        data={filled}
        margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-revenue)"
              stopOpacity={0.25}
            />
            <stop
              offset="95%"
              stopColor="var(--color-revenue)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>

        <CartesianGrid
          vertical={false}
          className="stroke-border/40"
          strokeDasharray="3 3"
        />

        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
          interval={tickInterval}
          tickFormatter={shortDate}
        />

        {/* Left Y — revenue */}
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
          tickFormatter={compactIDR}
          width={52}
        />

        {/* Right Y — order count */}
        <YAxis
          yAxisId="right"
          orientation="right"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
          width={28}
        />

        <ChartTooltip
          cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
          content={({ active, payload, label }) => (
            <RevTooltip
              active={active}
              payload={payload as TooltipEntry[]}
              label={label as string}
            />
          )}
        />

        {/* Revenue area */}
        <Area
          yAxisId="left"
          dataKey="revenue"
          type="monotone"
          stroke="var(--color-revenue)"
          strokeWidth={2}
          fill="url(#revGradient)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />

        {/* Order count line */}
        <Line
          yAxisId="right"
          dataKey="orders"
          type="monotone"
          stroke="var(--color-orders)"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />

        <ChartLegend content={<ChartLegendContent />} />
      </ComposedChart>
    </ChartContainer>
  );
}

// ── Gap filler ────────────────────────────────────────────────────────────────
// Ensures every date in the range has a data point (zeroes for missing days)

function fillGaps(data: RevenueSeries[], days: number): RevenueSeries[] {
  const byDate = Object.fromEntries(data.map(d => [d.date, d]));

  const result: RevenueSeries[] = [];
  const now  = new Date();
  const from = new Date(now.getTime() - days * 86_400_000);

  for (let d = new Date(from); d <= now; d = new Date(d.getTime() + 86_400_000)) {
    const iso = d.toISOString().slice(0, 10);
    result.push(byDate[iso] ?? { date: iso, revenue: 0, orders: 0 });
  }

  return result;
}
