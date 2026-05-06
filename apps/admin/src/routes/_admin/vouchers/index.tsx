// =============================================================================
// Vouchers list page — admin voucher management
// =============================================================================

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { api } from "@/lib/api";
import { formatIDR, formatDate, cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/vouchers/")({
  component: VouchersPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface Voucher {
  id: string;
  code: string;
  description: string | null;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: number;
  minimumOrderAmount: number;
  maximumDiscountAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface ApiResponse<T> { success: true; data: T }

const TYPE_LABELS: Record<string, string> = {
  percentage:    "Persentase",
  fixed_amount:  "Nominal Tetap",
  free_shipping: "Gratis Ongkir",
};

// ── Component ─────────────────────────────────────────────────────────────────

function VouchersPage() {
  const queryClient = useQueryClient();

  // Dialog state
  const [formDialog, setFormDialog] = useState<{
    mode: "create" | "edit";
    voucher?: Voucher;
  } | null>(null);

  const [form, setForm] = useState({
    code:                  "",
    description:           "",
    type:                  "percentage" as Voucher["type"],
    value:                 0,
    minimumOrderAmount:    0,
    maximumDiscountAmount: "",
    usageLimit:            "",
    perUserLimit:          1,
    isActive:              true,
    startsAt:              "",
    expiresAt:             "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["vouchers", "list"],
    queryFn: () => api.get<ApiResponse<Voucher[]>>("/vouchers"),
  });

  const vouchers = data?.data ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/vouchers", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      setFormDialog(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch(`/vouchers/${id}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      setFormDialog(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vouchers/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/vouchers/${id}`, { isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  function openCreate() {
    setForm({
      code: "", description: "", type: "percentage",
      value: 0, minimumOrderAmount: 0, maximumDiscountAmount: "",
      usageLimit: "", perUserLimit: 1, isActive: true,
      startsAt: "", expiresAt: "",
    });
    setFormDialog({ mode: "create" });
  }

  function openEdit(voucher: Voucher) {
    setForm({
      code:                  voucher.code,
      description:           voucher.description ?? "",
      type:                  voucher.type,
      value:                 voucher.value,
      minimumOrderAmount:    voucher.minimumOrderAmount,
      maximumDiscountAmount: voucher.maximumDiscountAmount?.toString() ?? "",
      usageLimit:            voucher.usageLimit?.toString() ?? "",
      perUserLimit:          voucher.perUserLimit,
      isActive:              voucher.isActive,
      startsAt:              voucher.startsAt ? voucher.startsAt.slice(0, 16) : "",
      expiresAt:             voucher.expiresAt ? voucher.expiresAt.slice(0, 16) : "",
    });
    setFormDialog({ mode: "edit", voucher });
  }

  function handleSubmit() {
    const body: Record<string, unknown> = {
      code:               form.code.toUpperCase(),
      description:        form.description || undefined,
      type:               form.type,
      value:              form.value,
      minimumOrderAmount: form.minimumOrderAmount,
      maximumDiscountAmount: form.maximumDiscountAmount ? Number(form.maximumDiscountAmount) : null,
      usageLimit:         form.usageLimit ? Number(form.usageLimit) : null,
      perUserLimit:       form.perUserLimit,
      isActive:           form.isActive,
      startsAt:           form.startsAt ? new Date(form.startsAt).toISOString() : null,
      expiresAt:          form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };

    if (formDialog?.mode === "edit" && formDialog.voucher) {
      updateMutation.mutate({ id: formDialog.voucher.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function formatValue(voucher: Voucher) {
    if (voucher.type === "percentage") return `${voucher.value}%`;
    if (voucher.type === "fixed_amount") return formatIDR(voucher.value);
    return "Gratis Ongkir";
  }

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns: Column<Voucher>[] = [
    {
      key: "code",
      header: "Kode",
      cell: (row) => (
        <span className="font-mono text-sm font-semibold text-foreground">{row.code}</span>
      ),
    },
    {
      key: "type",
      header: "Tipe",
      cell: (row) => (
        <div>
          <span className="text-sm">{TYPE_LABELS[row.type]}</span>
          <p className="text-xs text-muted-foreground font-semibold">{formatValue(row)}</p>
        </div>
      ),
    },
    {
      key: "usage",
      header: "Pemakaian",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.usageCount}{row.usageLimit ? ` / ${row.usageLimit}` : ""}
        </span>
      ),
    },
    {
      key: "validity",
      header: "Berlaku",
      cell: (row) => (
        <div className="text-xs text-muted-foreground">
          {row.startsAt && <p>Dari {formatDate(row.startsAt)}</p>}
          {row.expiresAt ? <p>S/d {formatDate(row.expiresAt)}</p> : <p>Tidak ada batas</p>}
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Aktif",
      cell: (row) => (
        <button
          onClick={() => toggleActiveMutation.mutate({ id: row.id, isActive: !row.isActive })}
          className={cn(
            "flex items-center gap-1 text-sm transition-colors",
            row.isActive ? "text-green-600 hover:text-green-700" : "text-muted-foreground hover:text-foreground"
          )}
          title={row.isActive ? "Nonaktifkan" : "Aktifkan"}
        >
          {row.isActive
            ? <ToggleRight className="h-5 w-5" />
            : <ToggleLeft className="h-5 w-5" />}
          {row.isActive ? "Aktif" : "Nonaktif"}
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-20",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(row)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Hapus voucher "${row.code}"?`)) {
                deleteMutation.mutate(row.id);
              }
            }}
            disabled={deleteMutation.isPending}
            className="flex h-7 w-7 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
            title="Hapus"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Voucher">
      <PageHeader
        title="Voucher"
        description={`${vouchers.length} voucher terdaftar`}
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Buat Voucher
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={vouchers}
        isLoading={isLoading}
        emptyMessage="Belum ada voucher"
        getRowKey={(row) => row.id}
      />

      {/* ── Form Dialog ───────────────────────────────────────────────────────── */}
      {formDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-foreground mb-4">
              {formDialog.mode === "create" ? "Buat Voucher Baru" : "Edit Voucher"}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Kode *</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    disabled={formDialog.mode === "edit"}
                    placeholder="DISKON10"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Tipe *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Voucher["type"] }))}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed_amount">Nominal Tetap (Rp)</option>
                    <option value="free_shipping">Gratis Ongkir</option>
                  </select>
                </div>
              </div>

              {form.type !== "free_shipping" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                      Nilai {form.type === "percentage" ? "(%)" : "(Rp)"} *
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.value}
                      onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {form.type === "percentage" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Maks. Diskon (Rp)</label>
                      <input
                        type="number"
                        min={0}
                        value={form.maximumDiscountAmount}
                        onChange={(e) => setForm((f) => ({ ...f, maximumDiscountAmount: e.target.value }))}
                        placeholder="Kosongkan = tidak ada batas"
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Deskripsi</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Opsional"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Min. Pembelian (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.minimumOrderAmount}
                    onChange={(e) => setForm((f) => ({ ...f, minimumOrderAmount: Number(e.target.value) }))}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Maks. Pemakaian Total</label>
                  <input
                    type="number"
                    min={1}
                    value={form.usageLimit}
                    onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                    placeholder="Kosongkan = tak terbatas"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Berlaku Mulai</label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Berakhir</label>
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-input"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-foreground">
                  Voucher aktif
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setFormDialog(null)}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving || !form.code}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Menyimpan..." : formDialog.mode === "create" ? "Buat Voucher" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
