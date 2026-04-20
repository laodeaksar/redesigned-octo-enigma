// =============================================================================
// DataTable — generic table with sort, pagination, empty state, loading state
// =============================================================================

import React, { type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Column definition ─────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

// ── Pagination meta ───────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  meta?: PaginationMeta;
  isLoading?: boolean;
  emptyMessage?: string;
  onPageChange?: (page: number) => void;
  onSortChange?: (key: string, dir: "asc" | "desc") => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  getRowKey?: (row: T) => string;
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
    <div className="rounded-lg border border-border bg-card shadow-sm">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground",
                    col.sortable && "cursor-pointer select-none hover:text-foreground",
                    col.headerClassName
                  )}
                  onClick={() => {
                    if (col.sortable && onSortChange) {
                      const newDir =
                        sortKey === col.key && sortDir === "asc" ? "desc" : "asc";
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

          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-16 text-center text-muted-foreground"
                >
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  <p className="mt-2 text-sm">Memuat data…</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-16 text-center text-muted-foreground"
                >
                  <p className="text-sm">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={getRowKey ? getRowKey(row) : rowIndex}
                  className="transition-colors hover:bg-muted/30"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-foreground",
                        col.className
                      )}
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
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Menampilkan{" "}
            <span className="font-medium">
              {(meta.page - 1) * meta.limit + 1}–
              {Math.min(meta.page * meta.limit, meta.total)}
            </span>{" "}
            dari <span className="font-medium">{meta.total}</span> data
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(meta.page - 1)}
              disabled={!meta.hasPrevPage}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-input text-sm disabled:opacity-40 hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              const page = getPageNumbers(meta.page, meta.totalPages)[i];
              if (!page) return null;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange?.(page)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md border text-sm",
                    page === meta.page
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input hover:bg-accent"
                  )}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => onPageChange?.(meta.page + 1)}
              disabled={!meta.hasNextPage}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-input text-sm disabled:opacity-40 hover:bg-accent"
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

