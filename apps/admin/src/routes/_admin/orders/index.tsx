// =============================================================================
// Orders list page
// =============================================================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Search } from "lucide-react";

import { api, type PaginatedResponse } from "@/lib/api";
import {
  cn,
  formatDateTime,
  formatIDR,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from "@/lib/utils";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";

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

// ── Query keys ────────────────────────────────────────────────────────────────

export const orderKeys = {
  list: (params: Record<string, unknown>) =>
    ["orders", "list", params] as const,
  detail: (id: string) => ["orders", "detail", id] as const,
};

// ── Status badge ──────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  warning: "bg-yellow-100 text-yellow-800",
  info: "bg-blue-100 text-blue-800",
  success: "bg-green-100 text-green-800",
  destructive: "bg-red-100 text-red-800",
  secondary: "bg-muted text-muted-foreground",
  default: "bg-muted text-muted-foreground",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABELS[status] ?? status;
  const color = ORDER_STATUS_COLORS[status] ?? "default";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        COLOR_MAP[color]
      )}
    >
      {label}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const ALL_STATUSES = [
  "pending_payment",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "refund_requested",
  "refunded",
];

function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const queryParams = { page, limit: 20, search, status, sortBy, sortOrder };

  const { data, isLoading } = useQuery({
    queryKey: orderKeys.list(queryParams),
    queryFn: () =>
      api.get<PaginatedResponse<Order>>("/orders", {
        params: queryParams,
      }),
    placeholderData: prev => prev,
  });

  const columns: Column<Order>[] = [
    {
      key: "orderNumber",
      header: "No. Pesanan",
      cell: row => (
        <span className="font-mono text-xs font-semibold">
          {row.orderNumber}
        </span>
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
  ];

  return (
    <AdminLayout title="Pesanan">
      <PageHeader
        description={`${data?.meta.total ?? 0} total pesanan`}
        title="Pesanan"
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            className="border-input bg-background focus:ring-ring h-9 w-full rounded-md border pl-9 pr-3 text-sm focus:outline-none focus:ring-2"
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nomor pesanan..."
            type="search"
            value={search}
          />
        </div>
        <select
          className="border-input bg-background focus:ring-ring h-9 rounded-md border px-3 text-sm focus:outline-none focus:ring-2"
          onChange={e => {
            setStatus(e.target.value);
            setPage(1);
          }}
          value={status}
        >
          <option value="">Semua Status</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s] ?? s}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        emptyMessage="Belum ada pesanan"
        getRowKey={row => row.id}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={setPage}
        onSortChange={(key, dir) => {
          setSortBy(key);
          setSortOrder(dir);
        }}
        sortDir={sortOrder}
        sortKey={sortBy}
      />
    </AdminLayout>
  );
}
