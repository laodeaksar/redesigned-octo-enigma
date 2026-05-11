// =============================================================================
// CheckoutForm — React island, client:load
// Fetches real shipping rates from RajaOngkir via /shipping/rates.
//
// Data fetching:
//   - Shipping rates  → useQuery (auto-fetches + caches when address changes)
//   - Voucher         → useMutation (on demand)
//   - Create order    → useMutation (sequential: order → payment)
// Feedback:
//   - Validation / network errors → notify.error (sonner)
//   - Shipping error retried inline via query refetch
//   - Voucher success shown inline (discount amount)
// =============================================================================

import { useCallback, useState } from "react";
import type React from "react";
import {
  useQuery,
  useMutation,
  QueryClientProvider,
} from "@tanstack/react-query";
import { $cart, $cartTotal, clearCart } from "@/stores/cart.store";
import { useStore } from "@nanostores/react";

import { api, apiProxy } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { notify } from "@/lib/toast";
import { formatIDR } from "@/lib/utils";
import { Badge } from "@repo/ui/components/badge";
import { Button, buttonVariants } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Address {
  city: string;
  cityId?: string;
  id: string;
  label: string;
  phone: string;
  postalCode: string;
  province: string;
  recipientName: string;
  street: string;
}

interface ShippingRate {
  cost: number;
  description: string;
  etd: string;
  service: string;
}

interface CourierRates {
  courier: string;
  name: string;
  rates: ShippingRate[];
}

interface SelectedRate {
  cost: number;
  courier: string;
  etd: string;
  service: string;
}

interface VoucherResult {
  code: string;
  discountAmount: number;
}

interface CheckoutVars {
  cart: ReturnType<typeof $cart.get>;
  customerNote?: string;
  destinationCityId: string;
  items: { quantity: number; variantId: string }[];
  shippingAddressId: string;
  shippingCost: number;
  courier: string;
  courierService: string;
  voucherCode?: string;
}

interface Props {
  addresses: Address[];
  totalWeightGrams?: number;
}

// ── Helper row ────────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function CheckoutFormInner({ addresses, totalWeightGrams = 1000 }: Props) {
  const cart = useStore($cart);
  const total = useStore($cartTotal);

  // ── Local selection state ────────────────────────────────────────────────────
  const [selectedAddress, setSelectedAddress] = useState(
    addresses[0]?.id ?? ""
  );
  const [selectedRate, setSelectedRate] = useState<SelectedRate | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherResult, setVoucherResult] = useState<VoucherResult | null>(
    null
  );
  const [note, setNote] = useState("");

  const currentAddress = addresses.find(a => a.id === selectedAddress);
  const discount = voucherResult?.discountAmount ?? 0;
  const grandTotal = Math.max(0, total + (selectedRate?.cost ?? 0) - discount);

  // ── Shipping rates query ─────────────────────────────────────────────────────
  // Re-runs automatically when selectedAddress changes.
  // Cached per (cityId, weight) so switching addresses is instant.
  const {
    data: shippingRates = [],
    isPending: ratesLoading,
    isError: ratesIsError,
    error: ratesQueryError,
    refetch: refetchRates,
  } = useQuery<CourierRates[]>({
    queryKey: ["shipping-rates", currentAddress?.cityId, totalWeightGrams],
    queryFn: async () => {
      const res = await api.post<{ success: true; data: CourierRates[] }>(
        "/shipping/rates",
        {
          destinationCityId: currentAddress!.cityId,
          weightGrams: totalWeightGrams,
        }
      );
      return res.data;
    },
    enabled: !!currentAddress?.cityId,
    staleTime: 5 * 60 * 1000, // rates valid 5 min
    retry: 1,
  });

  // Reset selected rate when address changes
  const handleAddressChange = useCallback((id: string) => {
    setSelectedAddress(id);
    setSelectedRate(null);
  }, []);

  // ── Voucher mutation ─────────────────────────────────────────────────────────
  const voucherMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiProxy.post<{
        success: true;
        data: VoucherResult;
      }>("/vouchers/validate", { code, orderAmount: total });
      return res.data;
    },
    onSuccess: data => {
      setVoucherResult(data);
    },
    onError: (err: Error) => {
      setVoucherResult(null);
      notify.error(err.message || "Voucher tidak valid atau sudah habis.");
    },
  });

  const handleValidateVoucher = () => {
    if (!voucherCode.trim()) return;
    voucherMutation.mutate(voucherCode.trim());
  };

  // ── Checkout mutation ────────────────────────────────────────────────────────
  // Two sequential calls: create order → create payment → Midtrans Snap
  const checkoutMutation = useMutation({
    mutationFn: async (vars: CheckoutVars) => {
      // Step 1: create order
      const orderRes = await apiProxy.post<{
        success: true;
        data: { id: string };
      }>("/orders", {
        items: vars.items,
        shippingAddressId: vars.shippingAddressId,
        destinationCityId: vars.destinationCityId,
        courier: vars.courier,
        courierService: vars.courierService,
        shippingCost: vars.shippingCost,
        voucherCode: vars.voucherCode,
        customerNote: vars.customerNote,
      });
      const orderId = orderRes.data.id;

      // Step 2: initiate payment
      const paymentRes = await apiProxy.post<{
        success: true;
        data: { snapToken: string | null; snapRedirectUrl: string | null };
      }>("/payments", { orderId });

      return { orderId, ...paymentRes.data };
    },

    onSuccess: ({ orderId, snapToken, snapRedirectUrl }) => {
      if (snapToken && typeof window !== "undefined") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).snap?.pay(snapToken, {
          onSuccess: () => {
            clearCart();
            window.location.href = `/orders/${orderId}?status=success`;
          },
          onPending: () => {
            clearCart();
            window.location.href = `/orders/${orderId}?status=pending`;
          },
          onError: () => {
            notify.error(
              "Pembayaran gagal.",
              "Silakan coba lagi atau pilih metode pembayaran lain."
            );
          },
          onClose: () => {
            window.location.href = `/orders/${orderId}`;
          },
        });
      } else if (snapRedirectUrl) {
        clearCart();
        window.location.href = snapRedirectUrl;
      }
    },

    onError: (err: Error) => {
      notify.error(
        "Gagal membuat pesanan",
        err.message || "Silakan coba lagi."
      );
    },
  });

  const handleCheckout = () => {
    // Client-side validation — use notify.error so the error is visible
    // above the fold even if the user is scrolled to the payment button
    if (!selectedAddress) {
      notify.error("Pilih alamat pengiriman terlebih dahulu.");
      return;
    }
    if (!selectedRate) {
      notify.error("Pilih metode pengiriman terlebih dahulu.");
      return;
    }
    if (cart.length === 0) {
      notify.error("Keranjang belanjamu kosong.");
      return;
    }
    if (!currentAddress?.cityId) {
      notify.error(
        "Alamat tidak memiliki data kota.",
        "Edit alamat dan pilih kota dari pencarian agar ongkir bisa dihitung."
      );
      return;
    }

    checkoutMutation.mutate({
      cart,
      items: cart.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
      shippingAddressId: selectedAddress,
      destinationCityId: currentAddress.cityId,
      courier: selectedRate.courier,
      courierService: selectedRate.service,
      shippingCost: selectedRate.cost,
      voucherCode: voucherResult?.code,
      customerNote: note || undefined,
    });
  };

  // ── Empty cart guard ─────────────────────────────────────────────────────────

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
        <span className="text-6xl">🛒</span>
        <p>Keranjang kosong</p>
        <a className={buttonVariants({ variant: "link" })} href="/products">
          Mulai belanja →
        </a>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* ── Address selector ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Alamat Pengiriman</CardTitle>
          </CardHeader>
          <CardContent>
            {addresses.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
                <svg
                  className="mx-auto mb-3 h-8 w-8 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mb-1 text-sm font-medium text-gray-600">
                  Belum ada alamat pengiriman
                </p>
                <p className="mb-4 text-xs text-gray-400">
                  Tambahkan alamat terlebih dahulu agar kamu bisa melanjutkan
                  checkout
                </p>
                <a
                  className={buttonVariants({ size: "sm" })}
                  href="/profile/addresses"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 5v14m7-7H5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Tambah Alamat
                </a>
              </div>
            ) : (
              <>
                {addresses.map(addr => (
                  <label
                    className={`mb-3 flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors ${
                      selectedAddress === addr.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    key={addr.id}
                  >
                    <input
                      checked={selectedAddress === addr.id}
                      className="accent-brand-500 mt-0.5"
                      name="address"
                      onChange={() => handleAddressChange(addr.id)}
                      type="radio"
                      value={addr.id}
                    />
                    <div className="text-sm">
                      <p className="font-semibold">
                        {addr.label} — {addr.recipientName}
                      </p>
                      <p className="text-gray-600">{addr.phone}</p>
                      <p className="text-gray-500">
                        {addr.street}, {addr.city}, {addr.province}{" "}
                        {addr.postalCode}
                      </p>
                      {!addr.cityId && (
                        <p className="mt-1 text-xs text-yellow-600">
                          ⚠ ID kota belum diset — ongkir tidak bisa dihitung
                        </p>
                      )}
                    </div>
                  </label>
                ))}
                <a
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                  href="/profile/addresses"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 5v14m7-7H5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Kelola atau tambah alamat lain
                </a>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Shipping rates ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Pilih Pengiriman</CardTitle>
          </CardHeader>
          <CardContent>
            {!currentAddress?.cityId ? (
              <p className="text-sm text-gray-400">
                Pilih alamat dengan data kota yang valid terlebih dahulu
              </p>
            ) : ratesLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                <Spinner />
                Mengambil tarif ongkir…
              </div>
            ) : ratesIsError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {ratesQueryError instanceof Error
                  ? ratesQueryError.message
                  : "Gagal mengambil tarif ongkir."}
                <button
                  className="ml-2 underline"
                  onClick={() => void refetchRates()}
                >
                  Coba lagi
                </button>
              </div>
            ) : shippingRates.length === 0 ? (
              <p className="text-sm text-gray-400">
                Tidak ada layanan tersedia untuk kota ini
              </p>
            ) : (
              shippingRates.map(group => (
                <div className="mb-4" key={group.courier}>
                  <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    {group.name}
                  </p>
                  {group.rates.map(rate => {
                    const isSelected =
                      selectedRate?.courier === group.courier &&
                      selectedRate?.service === rate.service;
                    return (
                      <label
                        className={`mb-2 flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                          isSelected
                            ? "border-brand-500 bg-brand-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        key={rate.service}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            checked={isSelected}
                            className="accent-brand-500"
                            name="shipping"
                            onChange={() =>
                              setSelectedRate({
                                courier: group.courier,
                                service: rate.service,
                                cost: rate.cost,
                                etd: rate.etd,
                              })
                            }
                            type="radio"
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {rate.service} — {rate.description}
                            </p>
                            {rate.etd && (
                              <p className="text-xs text-gray-500">
                                Estimasi {rate.etd} hari kerja
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatIDR(rate.cost)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* ── Voucher ──────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Voucher</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex gap-2">
              <Input
                className="flex-1 font-mono uppercase"
                disabled={!!voucherResult}
                onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleValidateVoucher();
                  }
                }}
                placeholder="Kode voucher"
                type="text"
                value={voucherCode}
              />
              {voucherResult ? (
                <Button
                  onClick={() => {
                    setVoucherResult(null);
                    setVoucherCode("");
                  }}
                  type="button"
                  variant="outline"
                >
                  Hapus
                </Button>
              ) : (
                <Button
                  disabled={voucherMutation.isPending || !voucherCode.trim()}
                  onClick={handleValidateVoucher}
                  type="button"
                  variant="outline"
                >
                  {voucherMutation.isPending ? (
                    <Spinner className="mr-1" />
                  ) : null}
                  Pakai
                </Button>
              )}
            </div>

            {/* Inline voucher success — stays here so the user can see the discount */}
            {voucherResult && (
              <p className="text-xs font-medium text-green-600">
                ✓ Hemat {formatIDR(voucherResult.discountAmount)} dengan kode{" "}
                <span className="font-mono">{voucherResult.code}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Notes ────────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Catatan (opsional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Label className="sr-only" htmlFor="checkout-note">
              Catatan untuk penjual
            </Label>
            <Textarea
              id="checkout-note"
              onChange={e => setNote(e.target.value)}
              placeholder="Pesan untuk penjual"
              rows={3}
              value={note}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Order summary (sticky sidebar) ───────────────────────────────────── */}
      <div className="lg:sticky lg:top-24">
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cart items */}
            <ul className="space-y-3">
              {cart.map(item => (
                <li
                  className="flex items-center gap-2 text-sm"
                  key={item.variantId}
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-50">
                    {item.imageUrl ? (
                      <img
                        alt={item.productName}
                        className="h-full w-full object-cover"
                        src={item.imageUrl}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        📦
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {item.productName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.variantName} × {item.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold">
                    {formatIDR(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <Separator />

            {/* Price breakdown */}
            <div className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatIDR(total)} />
              <Row
                label="Ongkir"
                value={selectedRate ? formatIDR(selectedRate.cost) : "—"}
              />
              {discount > 0 && (
                <Row
                  className="text-green-600"
                  label="Diskon Voucher"
                  value={`- ${formatIDR(discount)}`}
                />
              )}
              <Separator />
              <div className="flex justify-between pt-1 text-base font-bold">
                <span>Total</span>
                <span className="text-accent">{formatIDR(grandTotal)}</span>
              </div>
            </div>

            {/* Checkout mutation error shown inline below totals */}
            {checkoutMutation.isError && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                {checkoutMutation.error instanceof Error
                  ? checkoutMutation.error.message
                  : "Gagal membuat pesanan. Silakan coba lagi."}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex-col gap-2">
            <Button
              className="w-full"
              disabled={checkoutMutation.isPending || !selectedRate}
              onClick={handleCheckout}
              size="lg"
            >
              {checkoutMutation.isPending ? (
                <>
                  <Spinner className="mr-2" />
                  Memproses…
                </>
              ) : (
                `Bayar ${formatIDR(grandTotal)}`
              )}
            </Button>
            <Badge className="w-full justify-center" variant="secondary">
              🔒 Pembayaran aman via Midtrans
            </Badge>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// ── Export with QueryClientProvider ──────────────────────────────────────────

export default function CheckoutForm(props: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <CheckoutFormInner {...props} />
    </QueryClientProvider>
  );
}
