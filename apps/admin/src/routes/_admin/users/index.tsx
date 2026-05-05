// =============================================================================
// Users list page — admin user management via better-auth admin plugin
// =============================================================================

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, UserX, UserCheck, ShieldCheck, KeyRound } from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { api, type ApiResponse } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";

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
  banned: boolean | null;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
}

interface UsersListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const userKeys = {
  list: (params: Record<string, unknown>) => ["users", "list", params] as const,
};

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  customer:    { label: "Customer",    className: "bg-muted text-muted-foreground" },
  admin:       { label: "Admin",       className: "bg-blue-100 text-blue-800" },
  super_admin: { label: "Super Admin", className: "bg-purple-100 text-purple-800" },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active:               { label: "Aktif",            className: "bg-green-100 text-green-800" },
  inactive:             { label: "Nonaktif",          className: "bg-muted text-muted-foreground" },
  banned:               { label: "Diblokir",          className: "bg-red-100 text-red-800" },
  pending_verification: { label: "Belum Verifikasi",  className: "bg-yellow-100 text-yellow-800" },
};

// ── Component ─────────────────────────────────────────────────────────────────

function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [role, setRole]           = useState("");
  const [sortBy, setSortBy]       = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Role assignment dialog state
  const [roleDialog, setRoleDialog] = useState<{ userId: string; name: string; currentRole: string } | null>(null);
  const [newRole, setNewRole]       = useState<"customer" | "admin" | "super_admin">("customer");

  // Ban dialog state
  const [banDialog, setBanDialog] = useState<{ userId: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState("");

  const queryParams = { page, limit: 20, search, role, sortBy, sortOrder };

  const { data, isLoading } = useQuery({
    queryKey: userKeys.list(queryParams),
    queryFn: () =>
      api.get<ApiResponse<UsersListResponse>>("/admin/users", { params: queryParams }),
    placeholderData: (prev) => prev,
  });

  const users      = data?.data?.users     ?? [];
  const totalUsers = data?.data?.total     ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;

  const meta = {
    total:       totalUsers,
    page,
    limit:       20,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };

  // ── Mutations ──────────────────────────────────────────────────────────────

  const setRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      setRoleDialog(null);
    },
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      api.post(`/admin/users/${userId}/ban`, { reason: reason || undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      setBanDialog(null);
      setBanReason("");
    },
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/admin/users/${userId}/unban`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/admin/users/${userId}/revoke-sessions`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  // ── Table columns ──────────────────────────────────────────────────────────

  const isBanned = (row: User) =>
    row.banned === true &&
    (row.banExpires === null || new Date(row.banExpires) > new Date());

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
        const banned = isBanned(row);
        if (banned) {
          return (
            <div>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_CONFIG["banned"]!.className)}>
                Diblokir
              </span>
              {row.banReason && (
                <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-[120px]" title={row.banReason}>
                  {row.banReason}
                </p>
              )}
              {row.banExpires && (
                <p className="text-xs text-muted-foreground">
                  s/d {formatDate(row.banExpires)}
                </p>
              )}
            </div>
          );
        }
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
      className: "w-28",
      cell: (row) => (
        <div className="flex items-center gap-1">
          {/* Set Role */}
          <button
            onClick={() => {
              setRoleDialog({ userId: row.id, name: row.name, currentRole: row.role });
              setNewRole(row.role);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-blue-50 hover:text-blue-600"
            title="Ubah role"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
          </button>

          {/* Ban / Unban */}
          {isBanned(row) ? (
            <button
              onClick={() => unbanMutation.mutate(row.id)}
              disabled={unbanMutation.isPending}
              className="flex h-7 w-7 items-center justify-center rounded-md text-green-600 transition-colors hover:bg-green-50"
              title="Aktifkan"
            >
              <UserCheck className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setBanDialog({ userId: row.id, name: row.name })}
              className="flex h-7 w-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
              title="Blokir"
            >
              <UserX className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Revoke Sessions */}
          <button
            onClick={() => revokeSessionsMutation.mutate(row.id)}
            disabled={revokeSessionsMutation.isPending}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-amber-50 hover:text-amber-600"
            title="Cabut semua sesi"
          >
            <KeyRound className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Pengguna">
      <PageHeader
        title="Pengguna"
        description={`${totalUsers} pengguna terdaftar`}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
      </div>

      <DataTable
        columns={columns}
        data={users}
        meta={meta}
        isLoading={isLoading}
        emptyMessage="Belum ada pengguna"
        onPageChange={setPage}
        onSortChange={(key, dir) => { setSortBy(key); setSortOrder(dir); }}
        sortKey={sortBy}
        sortDir={sortOrder}
        getRowKey={(row) => row.id}
      />

      {/* ── Role Dialog ───────────────────────────────────────────────────────── */}
      {roleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground">Ubah Role</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pengguna: <span className="font-medium text-foreground">{roleDialog.name}</span>
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-foreground">Role baru</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as typeof newRole)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            {newRole !== roleDialog.currentRole && (
              <p className="mt-2 text-xs text-amber-600">
                ⚠ Semua sesi aktif pengguna ini akan dicabut setelah perubahan role.
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setRoleDialog(null)}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Batal
              </button>
              <button
                onClick={() => setRoleMutation.mutate({ userId: roleDialog.userId, role: newRole })}
                disabled={setRoleMutation.isPending || newRole === roleDialog.currentRole}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {setRoleMutation.isPending ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ban Dialog ────────────────────────────────────────────────────────── */}
      {banDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-destructive">Blokir Pengguna</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pengguna: <span className="font-medium text-foreground">{banDialog.name}</span>
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Alasan blokir <span className="text-muted-foreground">(opsional)</span>
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Misal: melanggar aturan penggunaan..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setBanDialog(null); setBanReason(""); }}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Batal
              </button>
              <button
                onClick={() => banMutation.mutate({ userId: banDialog.userId, reason: banReason })}
                disabled={banMutation.isPending}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {banMutation.isPending ? "Memblokir..." : "Blokir Pengguna"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
