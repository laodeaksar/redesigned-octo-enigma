// =============================================================================
// StatCard — KPI metric card with optional trend
// =============================================================================

import { type LucideIcon, Minus, TrendingDown, TrendingUp } from "lucide-react";
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
        "rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-medium text-muted-foreground text-sm">{title}</p>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className="font-bold text-2xl tracking-tight">{value}</p>
        {description && (
          <p className="mt-1 text-muted-foreground text-sm">{description}</p>
        )}
      </div>

      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          {isNeutral ? (
            <Minus className="h-4 w-4 text-muted-foreground" />
          ) : isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
          <span
            className={cn(
              "font-medium text-xs",
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
