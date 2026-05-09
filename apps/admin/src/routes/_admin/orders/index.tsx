// =============================================================================
// Orders list — bulk status update · date-range filter · CSV export
// Uses @repo/ui components throughout
// =============================================================================

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Eye, Filter, Loader2, Search, X } from "lucide-react";

import { api, type PaginatedResponse } from "@/lib/api";
import { cn, formatDateTime, formatIDR, ORDER_STATUS_LABELS } from "@/lib/utils";
import {
  ALL_ORDER_STATUSES,
  BULK_TARGET_STATUSES,
  orderKeys,
  OrderStatusBadge,
} from "@/lib/orders";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DataTable, type Column } from "@/components/shared/data-table";
import { OrderStatusSummary } from "@/components/shared/order-status-summary";
import { PageHeader } from "@/components/shared/page-header";

import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";

export const Route = createFileRoute("/_admin/orders/")({
  component: OrdersPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface Order {
  createdAt: string;
  grandTotal: number;
  id: string;
  itemCount: number;
  orderNumber: string;
  primaryItemName: string;
  status: string;
  userId: string;
}

// Sentinel value meaning "no status filter"
const STATUS_ALL = "__all__";

// ── CSV export ────────────────────────────────────────────────────────────────

function exportToCsv(orders: Order[]) {
  const headers = [
    "No. Pesanan",
    "Status",
    "Produk Utama",
    "Jumlah Item",
    "Total (IDR)",
    "Tanggal",
  ];
  const rows = orders.map(o => [
    o.orderNumber,
    ORDER_STATUS_LABELS[o.status] ?? o.status,
    o.primaryItemName,
    String(o.itemCount),
    String(o.grandTotal),
    formatDateTime(o.createdAt),
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pesanan-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

function OrdersPage() {
  // ── Filter state ──────────────────────────────────────────────────────────
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState(STATUS_ALL);
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [sortBy, setSortBy]       = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // ── Bulk selection state ──────────────────────────────────────────────────
  const [selectedIds, setSelectedIds]         = useState<Set<string>>(new Set());
  const [bulkTargetStatus, setBulkTargetStatus] = useState(BULK_TARGET_STATUSES[0].value);
  const [bulkDialogOpen, setBulkDialogOpen]   = useState(false);

  const queryClient = useQueryClient();

  // Strip sentinel before sending to API
  const apiStatus = status === STATUS_ALL ? "" : status;

  const queryParams = { page, limit: 20, search, status: apiStatus, dateFrom, dateTo, sortBy, sortOrder };

  const { data, isLoading } = useQuery({
    queryKey: orderKeys.list(queryParams),
    queryFn: () => api.get<PaginatedResponse<Order>>("/orders", { params: queryParams }),
    placeholderData: prev => prev,
  });

  const currentData = data?.data ?? [];

  // ── Bulk update mutation ──────────────────────────────────────────────────
  const bulkMutation = useMutation({
    mutationFn: async ({ ids, newStatus }: { ids: string[]; newStatus: string }) => {
      await Promise.all(
        ids.map(id => api.patch(`/orders/${id}/status`, { status: newStatus }))
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
      setSelectedIds(new Set());
      setBulkDialogOpen(false);
      setBulkTargetStatus(BULK_TARGET_STATUSES[0].value);
    },
  });

  // ── Selection helpers ─────────────────────────────────────────────────────
  const allOnPageSelected =
    currentData.length > 0 && currentData.every(o => selectedIds.has(o.id));

  const someOnPageSelected =
    currentData.some(o => selectedIds.has(o.id)) && !allOnPageSelected;

  const toggleRow = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) currentData.forEach(o => next.add(o.id));
      else currentData.forEach(o => next.delete(o.id));
      return next;
    });
  }, [currentData]);

  const filtersActive = Boolean(search || status !== STATUS_ALL || dateFrom || dateTo);

  const clearFilters = () => {
    setSearch("");
    setStatus(STATUS_ALL);
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns: Column<Order>[] = useMemo(() => [
    {
      key: "select",
      header: "",
      headerClassName: "w-10 px-3",
      className: "w-10 px-3",
      cell: row => (
        <Checkbox
          checked={selectedIds.has(row.id)}
          onCheckedChange={checked => toggleRow(row.id, Boolean(checked))}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      ),
    },
    {
      key: "orderNumber",
      header: "No. Pesanan",
      cell: row => (
        <span className="font-mono text-xs font-semibold">{row.orderNumber}</span>
      ),
    },
    {
      key: "item",
      header: "Produk",
      cell: row => (
        <div>
          <p className="text-foreground max-w-[180px] truncate text-sm font-medium">
            {row.primaryItemName}
          </p>
          <p className="text-muted-foreground text-xs">{row.itemCount} item</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: row => <OrderStatusBadge status={row.status} />,
    },
    {
      key: "grandTotal",
      header: "Total",
      sortable: true,
      cell: row => (
        <span className="font-semibold">{formatIDR(row.grandTotal)}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Tanggal",
      sortable: true,
      cell: row => (
        <span className="text-muted-foreground text-xs">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      cell: row => (
        <Link
          className="hover:bg-accent flex h-7 w-7 items-center justify-center rounded-md"
          params={{ orderId: row.id }}
          to="/_admin/orders/$orderId"
        >
          <Eye className="text-muted-foreground h-3.5 w-3.5" />
        </Link>
      ),
    },
  ], [selectedIds, toggleRow]);

  return (
    <AdminLayout title="Pesanan">
      <PageHeader
        actions={
          <Button
            disabled={currentData.length === 0}
            onClick={() => exportToCsv(currentData)}
            size="sm"
            variant="outline"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        }
        description={`${data?.meta.total ?? 0} total pesanan`}
        title="Pesanan"
      />

      {/* ── Status summary cards ─────────────────────────────────────────────── */}
      <OrderStatusSummary
        activeStatus={status}
        onStatusFilter={s => { setStatus(s); setPage(1); }}
      />

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="mb-4 space-y-3">

        {/* Row 1: search + status filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              className="pl-8"
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari nomor pesanan atau produk…"
              type="search"
              value={search}
            />
          </div>

          <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_ALL}>Semua Status</SelectItem>
              {ALL_ORDER_STATUSES.map(s => (
                <SelectItem key={s} value={s}>
                  {ORDER_STATUS_LABELS[s] ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filtersActive && (
            <Button onClick={clearFilters} size="sm" variant="ghost">
              <X className="mr-1 h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>

        {/* Row 2: date range */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm whitespace-nowrap">Dari</span>
            <Input
              className="w-[160px]"
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              type="date"
              value={dateFrom}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm whitespace-nowrap">Sampai</span>
            <Input
              className="w-[160px]"
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              type="date"
              value={dateTo}
            />
          </div>
        </div>

        {/* Row 3: select-all helper */}
        {currentData.length > 0 && (
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allOnPageSelected}
              onCheckedChange={checked => toggleAll(Boolean(checked))}
              data-indeterminate={someOnPageSelected ? true : undefined}
            />
            <span className="text-muted-foreground text-sm">
              {allOnPageSelected
                ? `Semua ${currentData.length} pesanan di halaman ini dipilih`
                : "Pilih semua pesanan di halaman ini"}
            </span>
            {selectedIds.size > 0 && !allOnPageSelected && (
              <span className="text-muted-foreground text-sm">
                · {selectedIds.size} terpilih
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Data table ───────────────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={currentData}
        emptyMessage="Belum ada pesanan"
        getRowKey={row => row.id}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={p => { setPage(p); setSelectedIds(new Set()); }}
        onSortChange={(key, dir) => { setSortBy(key); setSortOrder(dir); }}
        sortDir={sortOrder}
        sortKey={sortBy}
      />

      {/* ── Bulk action bar (floating) ────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="bg-card border-border fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border px-5 py-3 shadow-xl">
          <span className="text-sm font-semibold whitespace-nowrap">
            {selectedIds.size} pesanan dipilih
          </span>

          <Select
            value={bulkTargetStatus}
            onValueChange={v => setBulkTargetStatus(v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BULK_TARGET_STATUSES.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => setBulkDialogOpen(true)} size="sm">
            Terapkan
          </Button>

          <Button
            onClick={() => setSelectedIds(new Set())}
            size="sm"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── Bulk confirm dialog ───────────────────────────────────────────────── */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Perubahan Status Massal</DialogTitle>
          </DialogHeader>

          <p className="text-muted-foreground text-sm">
            Ubah status{" "}
            <strong className="text-foreground">{selectedIds.size} pesanan</strong>{" "}
            menjadi{" "}
            <strong className="text-foreground">
              {ORDER_STATUS_LABELS[bulkTargetStatus] ?? bulkTargetStatus}
            </strong>
            ? Aksi ini tidak dapat dibatalkan.
          </p>

          <DialogFooter>
            <Button onClick={() => setBulkDialogOpen(false)} variant="outline">
              Batal
            </Button>
            <Button
              disabled={bulkMutation.isPending}
              onClick={() =>
                bulkMutation.mutate({
                  ids: Array.from(selectedIds),
                  newStatus: bulkTargetStatus,
                })
              }
              variant={bulkTargetStatus === "cancelled" ? "destructive" : "default"}
            >
              {bulkMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses…
                </>
              ) : (
                "Terapkan Sekarang"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
