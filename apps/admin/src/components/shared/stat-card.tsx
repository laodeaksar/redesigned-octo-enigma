// =============================================================================
// StatCard — KPI metric card with optional trend
// =============================================================================

import { Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  className?: string;
  description?: string;
  icon?: LucideIcon;
  title: string;
  trend?: {
    value: number;
    label?: string;
  };
  value: string | number;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  const isPositive = (trend?.value ?? 0) > 0;
  const isNeutral = (trend?.value ?? 0) === 0;

  return (
    <div
      className={cn(
        "border-border bg-card text-card-foreground rounded-lg border p-6 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm font-medium">{title}</p>
        {Icon && (
          <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
            <Icon className="text-primary h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>

      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          {isNeutral ? (
            <Minus className="text-muted-foreground h-4 w-4" />
          ) : isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="text-destructive h-4 w-4" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              isNeutral
                ? "text-muted-foreground"
                : isPositive
                  ? "text-green-600"
                  : "text-destructive"
            )}
          >
            {isPositive ? "+" : ""}
            {trend.value}%
          </span>
          {trend.label && (
            <span className="text-muted-foreground text-xs">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
}
