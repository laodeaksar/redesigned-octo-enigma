// =============================================================================
// OrderStatusSummary — clickable status-count + revenue cards above orders table
// Uses @repo/ui Card, Skeleton, Separator, Button, Tooltip throughout
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { api } from "@/lib/api";
import { cn, formatIDR, formatRelativeTime, ORDER_STATUS_LABELS } from "@/lib/utils";
import { ALL_ORDER_STATUSES } from "@/lib/orders";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Separator } from "@repo/ui/components/separator";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatusBreakdown {
  count: number;
  revenue: number;
  status: string;
}

interface OrderStatusSummaryProps {
  activeStatus?: string;
  onStatusFilter?: (status: string) => void;
}

// ── Status visual config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { dot: string; value: string }> = {
  pending_payment:  { dot: "bg-yellow-400",  value: "text-yellow-700" },
  processing:       { dot: "bg-blue-500",    value: "text-blue-700"   },
  shipped:          { dot: "bg-indigo-500",  value: "text-indigo-700" },
  delivered:        { dot: "bg-teal-500",    value: "text-teal-700"   },
  completed:        { dot: "bg-green-500",   value: "text-green-700"  },
  cancelled:        { dot: "bg-red-500",     value: "text-red-700"    },
  refund_requested: { dot: "bg-orange-500",  value: "text-orange-700" },
  refunded:         { dot: "bg-gray-400",    value: "text-gray-500"   },
};

const STATUS_ALL = "__all__";

// ── Helpers ───────────────────────────────────────────────────────────────────

function compactIDR(amount: number): string {
  if (amount >= 1_000_000_000)
    return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`;
  if (amount >= 1_000_000)
    return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
  if (amount >= 1_000)
    return `Rp ${(amount / 1_000).toFixed(0)}rb`;
  return formatIDR(amount);
}

function formatExact(ts: number): string {
  return new Date(ts).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SummarySkeletons() {
  return (
    <div className="mb-6">
      <div className="mb-2 flex justify-end">
        <Skeleton className="h-7 w-52 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-[108px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ── Single status card ────────────────────────────────────────────────────────

interface StatusCardProps {
  colorClass?: string;
  count: number;
  dot?: string;
  isActive: boolean;
  label: string;
  revenue: number;
  onClick: () => void;
}

function StatusCard({
  colorClass,
  count,
  dot,
  isActive,
  label,
  revenue,
  onClick,
}: StatusCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        "cursor-pointer select-none transition-all hover:shadow-md",
        isActive
          ? "ring-primary ring-2 ring-offset-1"
          : "hover:ring-border hover:ring-1"
      )}
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="text-muted-foreground flex items-center gap-1.5 truncate text-xs font-medium">
          {dot && (
            <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", dot)} />
          )}
          <span className="truncate">{label}</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <p className={cn("text-2xl font-bold tabular-nums", colorClass)}>
          {count}
        </p>

        <Separator className="my-1.5" />

        <CardDescription className="truncate text-xs tabular-nums">
          {revenue > 0 ? compactIDR(revenue) : "—"}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OrderStatusSummary({
  activeStatus = STATUS_ALL,
  onStatusFilter,
}: OrderStatusSummaryProps) {
  const { data, dataUpdatedAt, isFetching, isLoading, refetch } = useQuery({
    queryKey: ["analytics", "order-statuses"],
    queryFn: () =>
      api.get<{ success: true; data: StatusBreakdown[] }>(
        "/analytics/order-statuses"
      ),
    staleTime: 2 * 60_000,
  });

  if (isLoading) {
    return <SummarySkeletons />;
  }

  const statuses = data?.data ?? [];

  const byStatus = Object.fromEntries(
    statuses.map(s => [s.status, { count: s.count, revenue: s.revenue ?? 0 }])
  );

  const totalCount   = statuses.reduce((sum, s) => sum + s.count, 0);
  const totalRevenue = statuses.reduce((sum, s) => sum + (s.revenue ?? 0), 0);

  const handleClick = (status: string) => {
    if (!onStatusFilter) return;
    onStatusFilter(activeStatus === status ? STATUS_ALL : status);
  };

  return (
    <div className="mb-6">
      {/* ── Toolbar row ──────────────────────────────────────────────────────── */}
      <div className="mb-2 flex items-center justify-end gap-2">
        {dataUpdatedAt > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-muted-foreground cursor-default text-xs">
                  Diperbarui {formatRelativeTime(new Date(dataUpdatedAt))}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {formatExact(dataUpdatedAt)}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <Button
          disabled={isFetching}
          size="sm"
          variant="ghost"
          onClick={() => void refetch()}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
          />
          {isFetching ? "Memperbarui…" : "Refresh"}
        </Button>
      </div>

      {/* ── Cards grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
        {/* Total card */}
        <StatusCard
          count={totalCount}
          colorClass="text-foreground"
          isActive={activeStatus === STATUS_ALL}
          label="Semua"
          revenue={totalRevenue}
          onClick={() => onStatusFilter?.(STATUS_ALL)}
        />

        {/* Per-status cards */}
        {ALL_ORDER_STATUSES.map(status => {
          const { count, revenue } = byStatus[status] ?? { count: 0, revenue: 0 };
          const cfg = STATUS_CONFIG[status];

          return (
            <StatusCard
              key={status}
              count={count}
              colorClass={count === 0 ? "text-muted-foreground" : cfg?.value}
              dot={cfg?.dot}
              isActive={activeStatus === status}
              label={ORDER_STATUS_LABELS[status] ?? status}
              revenue={revenue}
              onClick={() => handleClick(status)}
            />
          );
        })}
      </div>
    </div>
  );
}
