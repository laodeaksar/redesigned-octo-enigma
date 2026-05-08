// =============================================================================
// DataTable — generic table with sort, pagination, empty state, loading state
// =============================================================================

import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";

// ── Column definition ─────────────────────────────────────────────────────────

export interface Column<T> {
  cell: (row: T) => ReactNode;
  className?: string;
  header: string;
  headerClassName?: string;
  key: string;
  sortable?: boolean;
}

// ── Pagination meta ───────────────────────────────────────────────────────────

export interface PaginationMeta {
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  getRowKey?: (row: T) => string;
  isLoading?: boolean;
  meta?: PaginationMeta | undefined;
  onPageChange?: (page: number) => void;
  onSortChange?: (key: string, dir: "asc" | "desc") => void;
  sortDir?: "asc" | "desc";
  sortKey?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DataTable<T extends object>({
  columns,
  data,
  meta,
  isLoading = false,
  emptyMessage = "Tidak ada data",
  onPageChange,
  onSortChange,
  sortKey,
  sortDir,
  getRowKey,
}: DataTableProps<T>) {
  return (
    <div className="border-border bg-card rounded-lg border shadow-sm">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border bg-muted/50 border-b">
              {columns.map(col => (
                <th
                  className={cn(
                    "text-muted-foreground px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                    col.sortable &&
                      "hover:text-foreground cursor-pointer select-none",
                    col.headerClassName
                  )}
                  key={col.key}
                  onClick={() => {
                    if (col.sortable && onSortChange) {
                      const newDir =
                        sortKey === col.key && sortDir === "asc"
                          ? "desc"
                          : "asc";
                      onSortChange(col.key, newDir);
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <ChevronsUpDown
                        className={cn(
                          "h-3.5 w-3.5",
                          sortKey === col.key
                            ? "text-foreground"
                            : "text-muted-foreground/50"
                        )}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-border divide-y">
            {isLoading ? (
              <tr>
                <td
                  className="text-muted-foreground py-16 text-center"
                  colSpan={columns.length}
                >
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  <p className="mt-2 text-sm">Memuat data…</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  className="text-muted-foreground py-16 text-center"
                  colSpan={columns.length}
                >
                  <p className="text-sm">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  className="hover:bg-muted/30 transition-colors"
                  key={getRowKey ? getRowKey(row) : rowIndex}
                >
                  {columns.map(col => (
                    <td
                      className={cn("text-foreground px-4 py-3", col.className)}
                      key={col.key}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="border-border flex items-center justify-between border-t px-4 py-3">
          <p className="text-muted-foreground text-sm">
            Menampilkan{" "}
            <span className="font-medium">
              {(meta.page - 1) * meta.limit + 1}–
              {Math.min(meta.page * meta.limit, meta.total)}
            </span>{" "}
            dari <span className="font-medium">{meta.total}</span> data
          </p>

          <div className="flex items-center gap-1">
            <button
              className="border-input hover:bg-accent flex h-8 w-8 items-center justify-center rounded-md border text-sm disabled:opacity-40"
              disabled={!meta.hasPrevPage}
              onClick={() => onPageChange?.(meta.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              const page = getPageNumbers(meta.page, meta.totalPages)[i];
              if (!page) {
                return null;
              }
              return (
                <button
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md border text-sm",
                    page === meta.page
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input hover:bg-accent"
                  )}
                  key={page}
                  onClick={() => onPageChange?.(page)}
                >
                  {page}
                </button>
              );
            })}

            <button
              className="border-input hover:bg-accent flex h-8 w-8 items-center justify-center rounded-md border text-sm disabled:opacity-40"
              disabled={!meta.hasNextPage}
              onClick={() => onPageChange?.(meta.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): number[] {
  const half = 2;
  let start = Math.max(1, current - half);
  const end = Math.min(total, start + 4);
  start = Math.max(1, end - 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
