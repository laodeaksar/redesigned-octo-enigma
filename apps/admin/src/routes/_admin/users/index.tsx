// =============================================================================
// Users list page
// =============================================================================

import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, UserX, UserCheck } from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { api, type PaginatedResponse } from "@/lib/api";
import { formatDate, capitalize, cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/users/")({
  component: UsersPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin" | "super_admin";
  status: "active" | "inactive" | "banned" | "pending_verification";
  emailVerified: boolean;
  createdAt: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const userKeys = {
  list: (params: Record<string, unknown>) => ["users", "list", params] as const,
};

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  customer: { label: "Customer", className: "bg-muted text-muted-foreground" },
  admin: { label: "Admin", className: "bg-blue-100 text-blue-800" },
  super_admin: { label: "Super Admin", className: "bg-purple-100 text-purple-800" },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Aktif", className: "bg-green-100 text-green-800" },
  inactive: { label: "Nonaktif", className: "bg-muted text-muted-foreground" },
  banned: { label: "Diblokir", className: "bg-red-100 text-red-800" },
  pending_verification: { label: "Belum Verifikasi", className: "bg-yellow-100 text-yellow-800" },
};

// ── Component ─────────────────────────────────────────────────────────────────

function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const queryParams = { page, limit: 20, search, role, status, sortBy, sortOrder };

  const { data, isLoading } = useQuery({
    queryKey: userKeys.list(queryParams),
    queryFn: () =>
      api.get<PaginatedResponse<User>>("/users", {
        params: queryParams,
      }),
    placeholderData: (prev) => prev,
  });

  const toggleBanMutation = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) =>
      api.patch(`/users/${id}`, {
        status: currentStatus === "banned" ? "active" : "banned",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const columns: Column<User>[] = [
    {
      key: "user",
      header: "Pengguna",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => {
        const cfg = ROLE_CONFIG[row.role] ?? ROLE_CONFIG["customer"]!;
        return (
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", cfg.className)}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG["inactive"]!;
        return (
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", cfg.className)}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: "emailVerified",
      header: "Email",
      cell: (row) => (
        <span className={cn("text-xs", row.emailVerified ? "text-green-600" : "text-muted-foreground")}>
          {row.emailVerified ? "✓ Terverifikasi" : "Belum verifikasi"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Bergabung",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      cell: (row) =>
        row.role === "customer" ? (
          <button
            onClick={() =>
              toggleBanMutation.mutate({
                id: row.id,
                currentStatus: row.status,
              })
            }
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              row.status === "banned"
                ? "text-green-600 hover:bg-green-50"
                : "text-destructive hover:bg-destructive/10"
            )}
            title={row.status === "banned" ? "Aktifkan" : "Blokir"}
          >
            {row.status === "banned" ? (
              <UserCheck className="h-3.5 w-3.5" />
            ) : (
              <UserX className="h-3.5 w-3.5" />
            )}
          </button>
        ) : null,
    },
  ];

  return (
    <AdminLayout title="Pengguna">
      <PageHeader
        title="Pengguna"
        description={`${data?.meta.total ?? 0} pengguna terdaftar`}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Semua Role</option>
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
          <option value="banned">Diblokir</option>
          <option value="pending_verification">Belum Verifikasi</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        emptyMessage="Belum ada pengguna"
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

