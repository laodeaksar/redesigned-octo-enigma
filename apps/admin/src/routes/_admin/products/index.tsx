// =============================================================================
// Products list page
// =============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, ImageOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { type Column, DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { api, type PaginatedResponse } from "@/lib/api";
import { cn, formatDate, formatIDR } from "@/lib/utils";

export const Route = createFileRoute("/_admin/products/")({
  component: ProductsPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product {
  categoryId: string;
  createdAt: string;
  highestPrice: number;
  id: string;
  lowestPrice: number;
  name: string;
  primaryImage: string | null;
  slug: string;
  status: "active" | "draft" | "archived";
  tags: string[];
  totalStock: number;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const productKeys = {
  list: (params: Record<string, unknown>) =>
    ["products", "list", params] as const,
  detail: (id: string) => ["products", "detail", id] as const,
};

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active: { label: "Aktif", className: "bg-green-100 text-green-800" },
  draft: { label: "Draft", className: "bg-yellow-100 text-yellow-800" },
  archived: { label: "Arsip", className: "bg-muted text-muted-foreground" },
} as const;

function ProductStatusBadge({ status }: { status: Product["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 font-medium text-xs",
        cfg.className
      )}
    >
      {cfg.label}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

function ProductsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const queryParams = { page, limit: 20, search, status, sortBy, sortOrder };

  const { data, isLoading } = useQuery({
    queryKey: productKeys.list(queryParams),
    queryFn: () =>
      api.get<PaginatedResponse<Product>>("/products", {
        params: queryParams,
      }),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Produk",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.primaryImage ? (
            <img
              alt={row.name}
              className="h-10 w-10 rounded-md object-cover"
              src={row.primaryImage}
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <ImageOff className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-medium text-foreground">{row.name}</p>
            <p className="text-muted-foreground text-xs">{row.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <ProductStatusBadge status={row.status} />,
    },
    {
      key: "price",
      header: "Harga",
      sortable: true,
      cell: (row) => (
        <span className="font-medium">
          {row.lowestPrice === row.highestPrice
            ? formatIDR(row.lowestPrice)
            : `${formatIDR(row.lowestPrice)} – ${formatIDR(row.highestPrice)}`}
        </span>
      ),
    },
    {
      key: "totalStock",
      header: "Stok",
      sortable: true,
      cell: (row) => (
        <span
          className={cn(
            "font-medium",
            row.totalStock === 0
              ? "text-destructive"
              : row.totalStock <= 5
                ? "text-yellow-600"
                : "text-foreground"
          )}
        >
          {row.totalStock}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Dibuat",
      sortable: true,
      cell: (row) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-28",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Link
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
            params={{ productId: row.id }}
            title="Lihat detail"
            to="/_admin/products/$productId"
          >
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          <Link
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
            params={{ productId: row.id }}
            title="Edit"
            to="/_admin/products/$productId"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              if (confirm(`Hapus produk "${row.name}"?`)) {
                deleteMutation.mutate(row.id);
              }
            }}
            title="Hapus"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Produk">
      <PageHeader
        actions={
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground text-sm hover:opacity-90">
            <Plus className="h-4 w-4" />
            Tambah Produk
          </button>
        }
        description={`${data?.meta.total ?? 0} produk terdaftar`}
        title="Produk"
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-9 w-full rounded-md border border-input bg-background pr-3 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari produk..."
            type="search"
            value={search}
          />
        </div>

        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          value={status}
        >
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="draft">Draft</option>
          <option value="archived">Arsip</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        emptyMessage="Belum ada produk"
        getRowKey={(row) => row.id}
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
