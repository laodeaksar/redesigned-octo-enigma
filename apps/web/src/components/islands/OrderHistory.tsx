// =============================================================================
// OrderHistory — recent orders island using @repo/ui components (client:load)
// Shows last 5 orders with status badge, totals, and links.
// =============================================================================

import { useEffect, useState } from "react";

import { api, type Order } from "@/lib/api";
import {
  formatDateTime,
  formatIDR,
  ORDER_STATUS_LABELS,
} from "@/lib/utils";

import { Badge } from "@repo/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { Separator } from "@repo/ui/components/separator";
import { Skeleton } from "@repo/ui/components/skeleton";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  token: string;
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending_payment:  "outline",
  processing:       "secondary",
  shipped:          "default",
  delivered:        "secondary",
  completed:        "default",
  cancelled:        "destructive",
  refund_requested: "destructive",
  refunded:         "outline",
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function OrderSkeletons() {
  return (
    <div className="space-y-px">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          className="flex items-center justify-between px-1 py-3.5"
          key={i}
        >
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OrderHistory({ token }: Props) {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{
        success: true;
        data: Order[];
        meta: { total: number; totalPages: number };
      }>("/orders/me", { token, params: { page: 1, limit: 5 } })
      .then(res => setOrders(res.data))
      .catch(() => setError("Gagal memuat pesanan."))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pesanan Terbaru</CardTitle>
        <CardDescription>5 pesanan terakhir dari akunmu</CardDescription>
      </CardHeader>

      <CardContent>
        {/* Loading */}
        {loading && <OrderSkeletons />}

        {/* Error */}
        {!loading && error && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {error}
          </p>
        )}

        {/* Empty */}
        {!loading && !error && orders.length === 0 && (
          <Empty className="border border-dashed py-10">
            <EmptyHeader>
              <EmptyMedia>
                <svg
                  className="h-10 w-10 text-muted-foreground/40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.25}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M20 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1ZM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </EmptyMedia>
              <EmptyTitle>Belum ada pesanan</EmptyTitle>
              <EmptyDescription>
                Yuk mulai belanja dan temukan produk favoritmu!
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <a
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                href="/products"
              >
                Belanja Sekarang
              </a>
            </EmptyContent>
          </Empty>
        )}

        {/* Order list */}
        {!loading && !error && orders.length > 0 && (
          <ul className="-mx-1">
            {orders.map((order, i) => (
              <li key={order.id}>
                <a
                  className="group flex items-start justify-between gap-4 rounded-lg px-1 py-3 transition-colors hover:bg-muted/50"
                  href={`/orders/${order.id}`}
                >
                  {/* Left — order info */}
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {order.orderNumber}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                      {" · "}
                      {order.itemCount} item
                      {" · "}
                      <span className="font-medium text-foreground">
                        {formatIDR(order.grandTotal)}
                      </span>
                    </p>
                  </div>

                  {/* Right — status + chevron */}
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </Badge>
                    <svg
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M9 5l7 7-7 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </a>

                {i < orders.length - 1 && (
                  <Separator className="my-0" />
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {/* Footer — only when there are orders */}
      {!loading && orders.length > 0 && (
        <CardFooter className="justify-between">
          <p className="text-xs text-muted-foreground">
            Menampilkan {orders.length} pesanan terbaru
          </p>
          <a
            className="text-sm font-medium text-primary hover:underline"
            href="/orders"
          >
            Lihat Semua →
          </a>
        </CardFooter>
      )}
    </Card>
  );
}
