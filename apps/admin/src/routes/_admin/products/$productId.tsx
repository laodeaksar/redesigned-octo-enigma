// =============================================================================
// Product detail page
// =============================================================================

import type React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ImageOff, Layers, Package, Tag } from "lucide-react";

import { api, type ApiResponse } from "@/lib/api";
import { cn, formatDate, formatIDR } from "@/lib/utils";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/shared/page-header";

import { productKeys } from "./index";

export const Route = createFileRoute("/_admin/products/$productId")({
  component: ProductDetailPage,
});

interface ProductDetail {
  category: { id: string; name: string; slug: string } | null;
  createdAt: string;
  description: string;
  id: string;
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    isPrimary: boolean;
    sortOrder: number;
  }>;
  name: string;
  shortDescription: string | null;
  slug: string;
  status: "active" | "draft" | "archived";
  tags: string[];
  updatedAt: string;
  variants: Array<{
    id: string;
    sku: string;
    name: string;
    attributes: Record<string, string>;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    isActive: boolean;
  }>;
  weight: number | null;
}

const STATUS_LABELS = {
  active: { label: "Aktif", class: "bg-green-100 text-green-800" },
  draft: { label: "Draft", class: "bg-yellow-100 text-yellow-800" },
  archived: { label: "Arsip", class: "bg-muted text-muted-foreground" },
};

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: () =>
      api.get<ApiResponse<ProductDetail>>(`/products/${productId}`),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/products/${productId}`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: productKeys.detail(productId),
      });
      void queryClient.invalidateQueries({ queryKey: ["products", "list"] });
    },
  });

  const product = data?.data;
  const statusCfg = product ? STATUS_LABELS[product.status] : null;

  if (isLoading) {
    return (
      <AdminLayout title="Produk">
        <div className="text-muted-foreground flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="mt-2 text-sm">Memuat produk…</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !product) {
    return (
      <AdminLayout title="Produk">
        <div className="text-muted-foreground flex h-64 items-center justify-center">
          <p>Produk tidak ditemukan.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Detail Produk">
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            {/* Status toggle */}
            <select
              className="border-input bg-background focus:ring-ring h-9 rounded-md border px-3 text-sm focus:outline-none focus:ring-2"
              onChange={e => statusMutation.mutate(e.target.value)}
              value={product.status}
            >
              <option value="active">Aktif</option>
              <option value="draft">Draft</option>
              <option value="archived">Arsip</option>
            </select>
          </div>
        }
        breadcrumbs={[
          { label: "Produk", href: "/_admin/products/" },
          { label: product.name },
        ]}
        title={product.name}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Images */}
          <Section icon={ImageOff} title="Gambar Produk">
            {product.images.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum ada gambar.</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {product.images
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(img => (
                    <div className="relative" key={img.id}>
                      <img
                        alt={img.altText ?? product.name}
                        className="aspect-square w-full rounded-lg object-cover"
                        src={img.url}
                      />
                      {img.isPrimary && (
                        <span className="bg-primary text-primary-foreground absolute left-1 top-1 rounded px-1.5 py-0.5 text-xs font-medium">
                          Utama
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </Section>

          {/* Variants */}
          <Section icon={Layers} title="Varian">
            {product.variants.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum ada varian.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-border text-muted-foreground border-b text-left text-xs">
                      <th className="pb-2 font-medium">SKU</th>
                      <th className="pb-2 font-medium">Nama</th>
                      <th className="pb-2 font-medium">Harga</th>
                      <th className="pb-2 font-medium">Stok</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {product.variants.map(v => (
                      <tr key={v.id}>
                        <td className="py-2.5 font-mono text-xs">{v.sku}</td>
                        <td className="py-2.5">{v.name}</td>
                        <td className="py-2.5">
                          <div>
                            <span className="font-medium">
                              {formatIDR(v.price)}
                            </span>
                            {v.compareAtPrice && (
                              <span className="text-muted-foreground ml-1.5 text-xs line-through">
                                {formatIDR(v.compareAtPrice)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={cn(
                              "font-medium",
                              v.stock === 0
                                ? "text-destructive"
                                : v.stock <= 5
                                  ? "text-yellow-600"
                                  : ""
                            )}
                          >
                            {v.stock}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              v.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {v.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        {/* Right column — metadata */}
        <div className="space-y-6">
          <Section icon={Package} title="Info Produk">
            <dl className="space-y-3 text-sm">
              <InfoRow label="Status">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    statusCfg?.class
                  )}
                >
                  {statusCfg?.label}
                </span>
              </InfoRow>
              <InfoRow label="Kategori">
                {product.category?.name ?? "—"}
              </InfoRow>
              <InfoRow label="Berat">
                {product.weight ? `${product.weight}g` : "—"}
              </InfoRow>
              <InfoRow label="Dibuat">{formatDate(product.createdAt)}</InfoRow>
              <InfoRow label="Diperbarui">
                {formatDate(product.updatedAt)}
              </InfoRow>
            </dl>
          </Section>

          <Section icon={Tag} title="Tags">
            {product.tags.length === 0 ? (
              <p className="text-muted-foreground text-sm">Tidak ada tag.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {product.tags.map(tag => (
                  <span
                    className="bg-muted text-foreground rounded-full px-2.5 py-1 text-xs font-medium"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Section>

          <Section title="Deskripsi">
            <p className="text-muted-foreground text-sm leading-relaxed">
              {product.shortDescription ?? product.description}
            </p>
          </Section>
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card rounded-lg border p-5 shadow-sm">
      <h3 className="text-foreground mb-4 flex items-center gap-2 text-sm font-semibold">
        {Icon && <Icon className="text-muted-foreground h-4 w-4" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground text-right font-medium">{children}</dd>
    </div>
  );
}
