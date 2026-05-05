// =============================================================================
// Products list page
// =============================================================================

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  ImageOff,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { api, type PaginatedResponse } from "@/lib/api";
import { formatIDR, formatDate, cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/products/")({
  component: ProductsPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  slug: string;
  status: "active" | "draft" | "archived";
  categoryId: string;
  tags: string[];
  primaryImage: string | null;
  lowestPrice: number;
  highestPrice: number;
  totalStock: number;
  createdAt: string;
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
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
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
    mutationFn: (id: string) =>
      api.delete(`/products/${id}`),
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
              src={row.primaryImage}
              alt={row.name}
              className="h-10 w-10 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <ImageOff className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-medium text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.slug}</p>
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
        <span className="text-sm text-muted-foreground">
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
            to="/_admin/products/$productId"
            params={{ productId: row.id }}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
            title="Lihat detail"
          >
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          <Link
            to="/_admin/products/$productId"
            params={{ productId: row.id }}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          <button
            onClick={() => {
              if (confirm(`Hapus produk "${row.name}"?`)) {
                deleteMutation.mutate(row.id);
              }
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-destructive/10 hover:text-destructive"
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
        title="Produk"
        description={`${data?.meta.total ?? 0} produk terdaftar`}
        actions={
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" />
            Tambah Produk
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
        meta={data?.meta}
        isLoading={isLoading}
        emptyMessage="Belum ada produk"
        onPageChange={setPage}
        onSortChange={(key, dir) => {
          setSortBy(key);
          setSortOrder(dir);
        }}
        sortKey={sortBy}
        sortDir={sortOrder}
        getRowKey={(row) => row.id}
      />
    </AdminLayout>
  );
}

