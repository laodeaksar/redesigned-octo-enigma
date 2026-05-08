// =============================================================================
// PageHeader — page-level title with optional breadcrumb and CTA
// =============================================================================

import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Breadcrumb {
  href?: string;
  label: string;
}

interface PageHeaderProps {
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  className?: string;
  description?: string;
  title: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center gap-1 text-muted-foreground text-sm">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              {crumb.href ? (
                <Link
                  className="transition-colors hover:text-foreground"
                  to={crumb.href}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-2xl text-foreground tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-muted-foreground text-sm">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
