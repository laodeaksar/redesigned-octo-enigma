// =============================================================================
// Users list page — admin user management via better-auth admin plugin
// =============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Search, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { type Column, DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { type ApiResponse, api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_admin/users/")({
  component: UsersPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface User {
  banExpires: string | null;
  banned: boolean | null;
  banReason: string | null;
  createdAt: string;
  email: string;
  emailVerified: boolean;
  id: string;
  name: string;
  role: "customer" | "admin" | "super_admin";
  status: "active" | "inactive" | "banned" | "pending_verification";
}

interface UsersListResponse {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
  users: User[];
}

// ── Config ────────────────────────────────────────────────────────────────────

const userKeys = {
  list: (params: Record<string, unknown>) => ["users", "list", params] as const,
};

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  customer: { label: "Customer", className: "bg-muted text-muted-foreground" },
  admin: { label: "Admin", className: "bg-blue-100 text-blue-800" },
  super_admin: {
    label: "Super Admin",
    className: "bg-purple-100 text-purple-800",
  },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Aktif", className: "bg-green-100 text-green-800" },
  inactive: { label: "Nonaktif", className: "bg-muted text-muted-foreground" },
  banned: { label: "Diblokir", className: "bg-red-100 text-red-800" },
  pending_verification: {
    label: "Belum Verifikasi",
    className: "bg-yellow-100 text-yellow-800",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Role assignment dialog state
  const [roleDialog, setRoleDialog] = useState<{
    userId: string;
    name: string;
    currentRole: string;
  } | null>(null);
  const [newRole, setNewRole] = useState<"customer" | "admin" | "super_admin">(
    "customer"
  );

  // Ban dialog state
  const [banDialog, setBanDialog] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [banReason, setBanReason] = useState("");

  const queryParams = { page, limit: 20, search, role, sortBy, sortOrder };

  const { data, isLoading } = useQuery({
    queryKey: userKeys.list(queryParams),
    queryFn: () =>
      api.get<ApiResponse<UsersListResponse>>("/admin/users", {
        params: queryParams,
      }),
    placeholderData: (prev) => prev,
  });

  const users = data?.data?.users ?? [];
  const totalUsers = data?.data?.total ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;

  const meta = {
    total: totalUsers,
    page,
    limit: 20,
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">{row.name}</p>
            <p className="text-muted-foreground text-xs">{row.email}</p>
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
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 font-medium text-xs",
              cfg.className
            )}
          >
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
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-medium text-xs",
                  STATUS_CONFIG["banned"]!.className
                )}
              >
                Diblokir
              </span>
              {row.banReason && (
                <p
                  className="mt-0.5 max-w-[120px] truncate text-muted-foreground text-xs"
                  title={row.banReason}
                >
                  {row.banReason}
                </p>
              )}
              {row.banExpires && (
                <p className="text-muted-foreground text-xs">
                  s/d {formatDate(row.banExpires)}
                </p>
              )}
            </div>
          );
        }
        const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG["inactive"]!;
        return (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 font-medium text-xs",
              cfg.className
            )}
          >
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: "emailVerified",
      header: "Email",
      cell: (row) => (
        <span
          className={cn(
            "text-xs",
            row.emailVerified ? "text-green-600" : "text-muted-foreground"
          )}
        >
          {row.emailVerified ? "✓ Terverifikasi" : "Belum verifikasi"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Bergabung",
      sortable: true,
      cell: (row) => (
        <span className="text-muted-foreground text-xs">
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
          {/* Set Role */}
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-blue-50 hover:text-blue-600"
            onClick={() => {
              setRoleDialog({
                userId: row.id,
                name: row.name,
                currentRole: row.role,
              });
              setNewRole(row.role);
            }}
            title="Ubah role"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
          </button>

          {/* Ban / Unban */}
          {isBanned(row) ? (
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-green-600 transition-colors hover:bg-green-50"
              disabled={unbanMutation.isPending}
              onClick={() => unbanMutation.mutate(row.id)}
              title="Aktifkan"
            >
              <UserCheck className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
              onClick={() => setBanDialog({ userId: row.id, name: row.name })}
              title="Blokir"
            >
              <UserX className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Revoke Sessions */}
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-amber-50 hover:text-amber-600"
            disabled={revokeSessionsMutation.isPending}
            onClick={() => revokeSessionsMutation.mutate(row.id)}
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
        description={`${totalUsers} pengguna terdaftar`}
        title="Pengguna"
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
            placeholder="Cari nama atau email..."
            type="search"
            value={search}
          />
        </div>

        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          value={role}
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
        emptyMessage="Belum ada pengguna"
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        meta={meta}
        onPageChange={setPage}
        onSortChange={(key, dir) => {
          setSortBy(key);
          setSortOrder(dir);
        }}
        sortDir={sortOrder}
        sortKey={sortBy}
      />

      {/* ── Role Dialog ───────────────────────────────────────────────────────── */}
      {roleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="font-semibold text-base text-foreground">
              Ubah Role
            </h3>
            <p className="mt-1 text-muted-foreground text-sm">
              Pengguna:{" "}
              <span className="font-medium text-foreground">
                {roleDialog.name}
              </span>
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block font-medium text-foreground text-sm">
                Role baru
              </label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) => setNewRole(e.target.value as typeof newRole)}
                value={newRole}
              >
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            {newRole !== roleDialog.currentRole && (
              <p className="mt-2 text-amber-600 text-xs">
                ⚠ Semua sesi aktif pengguna ini akan dicabut setelah perubahan
                role.
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-md border border-input px-4 py-2 font-medium text-foreground text-sm transition-colors hover:bg-muted"
                onClick={() => setRoleDialog(null)}
              >
                Batal
              </button>
              <button
                className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  setRoleMutation.isPending ||
                  newRole === roleDialog.currentRole
                }
                onClick={() =>
                  setRoleMutation.mutate({
                    userId: roleDialog.userId,
                    role: newRole,
                  })
                }
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
            <h3 className="font-semibold text-base text-destructive">
              Blokir Pengguna
            </h3>
            <p className="mt-1 text-muted-foreground text-sm">
              Pengguna:{" "}
              <span className="font-medium text-foreground">
                {banDialog.name}
              </span>
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block font-medium text-foreground text-sm">
                Alasan blokir{" "}
                <span className="text-muted-foreground">(opsional)</span>
              </label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Misal: melanggar aturan penggunaan..."
                rows={3}
                value={banReason}
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-md border border-input px-4 py-2 font-medium text-foreground text-sm transition-colors hover:bg-muted"
                onClick={() => {
                  setBanDialog(null);
                  setBanReason("");
                }}
              >
                Batal
              </button>
              <button
                className="rounded-md bg-destructive px-4 py-2 font-medium text-destructive-foreground text-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={banMutation.isPending}
                onClick={() =>
                  banMutation.mutate({
                    userId: banDialog.userId,
                    reason: banReason,
                  })
                }
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
