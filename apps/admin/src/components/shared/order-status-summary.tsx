// =============================================================================
// OrderStatusSummary — clickable status-count cards above the orders table
// Uses @repo/ui Card + Skeleton throughout
// =============================================================================

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { cn, ORDER_STATUS_LABELS } from "@/lib/utils";
import { ALL_ORDER_STATUSES } from "@/lib/orders";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatusBreakdown {
  count: number;
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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SummarySkeletons() {
  return (
    <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-[84px] rounded-xl" />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OrderStatusSummary({
  activeStatus = STATUS_ALL,
  onStatusFilter,
}: OrderStatusSummaryProps) {
  const { data, isLoading } = useQuery({
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
  const countByStatus = Object.fromEntries(
    statuses.map(s => [s.status, s.count])
  );
  const total = statuses.reduce((sum, s) => sum + s.count, 0);

  const handleClick = (status: string) => {
    if (!onStatusFilter) return;
    onStatusFilter(activeStatus === status ? STATUS_ALL : status);
  };

  return (
    <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
      {/* ── Total card ─────────────────────────────────────────────────────── */}
      <Card
        size="sm"
        className={cn(
          "cursor-pointer select-none transition-all hover:shadow-md",
          activeStatus === STATUS_ALL
            ? "ring-primary ring-2 ring-offset-1"
            : "hover:ring-border hover:ring-1"
        )}
        onClick={() => onStatusFilter?.(STATUS_ALL)}
      >
        <CardHeader>
          <CardTitle className="text-muted-foreground truncate text-xs font-medium">
            Semua
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground text-2xl font-bold tabular-nums">
            {total}
          </p>
        </CardContent>
      </Card>

      {/* ── Per-status cards ────────────────────────────────────────────────── */}
      {ALL_ORDER_STATUSES.map(status => {
        const count = countByStatus[status] ?? 0;
        const cfg = STATUS_CONFIG[status];
        const isActive = activeStatus === status;

        return (
          <Card
            key={status}
            size="sm"
            className={cn(
              "cursor-pointer select-none transition-all hover:shadow-md",
              isActive
                ? "ring-primary ring-2 ring-offset-1"
                : "hover:ring-border hover:ring-1"
            )}
            onClick={() => handleClick(status)}
          >
            <CardHeader>
              <CardTitle className="text-muted-foreground flex items-center gap-1.5 truncate text-xs font-medium">
                <span
                  className={cn(
                    "inline-block h-2 w-2 shrink-0 rounded-full",
                    cfg?.dot
                  )}
                />
                <span className="truncate">
                  {ORDER_STATUS_LABELS[status] ?? status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  count === 0 ? "text-muted-foreground" : cfg?.value
                )}
              >
                {count}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
