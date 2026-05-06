// =============================================================================
// CartPage — React island, full cart page (client:load)
// =============================================================================

import React, { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  $cart,
  $cartTotal,
  $cartCount,
  updateQuantity,
  removeFromCart,
  clearCart,
  hydrateCart,
  type CartItem,
} from "@/stores/cart.store";
import { formatIDR } from "@/lib/utils";

const SHIPPING_FREE_THRESHOLD = 100_000;
const ESTIMATED_SHIPPING = 15_000;

function CartItemRow({ item }: { item: CartItem }) {
  return (
    <li className="flex gap-4 py-5 border-b border-gray-100 last:border-b-0">
      {/* Image */}
      <a
        href={`/products/${item.variantId}`}
        className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100"
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.productName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-gray-200">
            📦
          </div>
        )}
      </a>

      {/* Details */}
      <div className="flex flex-1 flex-col justify-between gap-2 min-w-0">
        <div>
          <p className="font-medium text-gray-900 leading-snug line-clamp-2">
            {item.productName}
          </p>
          <p className="mt-0.5 text-sm text-gray-500">{item.variantName}</p>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Quantity stepper */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-white">
            <button
              onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
              aria-label="Kurangi"
              className="flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-50 rounded-l-lg transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
              </svg>
            </button>
            <span className="w-10 text-center text-sm font-semibold text-gray-900 select-none">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
              aria-label="Tambah"
              className="flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-50 rounded-r-lg transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
              </svg>
            </button>
          </div>

          {/* Price + Remove */}
          <div className="flex items-center gap-4">
            <span className="text-base font-bold text-gray-900">
              {formatIDR(item.price * item.quantity)}
            </span>
            <button
              onClick={() => removeFromCart(item.variantId)}
              aria-label="Hapus item"
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 text-5xl">
        🛒
      </div>
      <h2 className="text-xl font-semibold text-gray-900">Keranjangmu kosong</h2>
      <p className="mt-2 text-sm text-gray-500">
        Yuk, temukan produk yang kamu suka dan tambahkan ke keranjang!
      </p>
      <a
        href="/products"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow transition-all hover:opacity-90 hover:scale-105"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
        </svg>
        Mulai Belanja
      </a>
    </div>
  );
}

export default function CartPage() {
  const cart = useStore($cart);
  const total = useStore($cartTotal);
  const count = useStore($cartCount);
  const [hydrated, setHydrated] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    hydrateCart();
    setHydrated(true);
  }, []);

  const isFreeShipping = total >= SHIPPING_FREE_THRESHOLD;
  const shippingCost = isFreeShipping ? 0 : ESTIMATED_SHIPPING;
  const grandTotal = total + shippingCost;
  const remainingForFreeShipping = SHIPPING_FREE_THRESHOLD - total;

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (cart.length === 0) {
    return <EmptyCart />;
  }

  const handleClearCart = () => {
    if (!window.confirm("Hapus semua item dari keranjang?")) return;
    setClearing(true);
    setTimeout(() => {
      clearCart();
      setClearing(false);
    }, 200);
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Cart items */}
      <div className="lg:col-span-2">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">
            {count} produk dalam keranjang
          </h2>
          <button
            onClick={handleClearCart}
            disabled={clearing}
            className="text-sm text-red-500 hover:underline disabled:opacity-50"
          >
            Hapus semua
          </button>
        </div>

        {/* Free shipping progress */}
        {!isFreeShipping && (
          <div className="mb-5 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-amber-800 font-medium">
                Tambah <span className="font-bold">{formatIDR(remainingForFreeShipping)}</span> lagi untuk gratis ongkir!
              </span>
              <span className="text-amber-600 text-xs">🚚</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-amber-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (total / SHIPPING_FREE_THRESHOLD) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {isFreeShipping && (
          <div className="mb-5 rounded-xl bg-green-50 border border-green-100 px-4 py-3 flex items-center gap-2 text-sm font-medium text-green-700">
            <span>🎉</span>
            <span>Selamat! Kamu mendapatkan gratis ongkir!</span>
          </div>
        )}

        {/* Items list */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm px-5">
          <ul>
            {cart.map((item) => (
              <CartItemRow key={item.variantId} item={item} />
            ))}
          </ul>
        </div>

        {/* Continue shopping */}
        <a
          href="/products"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Lanjutkan belanja
        </a>
      </div>

      {/* Order summary */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 rounded-xl border border-gray-100 bg-white shadow-sm p-6">
          <h2 className="mb-5 text-base font-semibold text-gray-900">Ringkasan Pesanan</h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between text-gray-600">
              <span>Subtotal ({count} item)</span>
              <span className="font-medium text-gray-900">{formatIDR(total)}</span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <span>Ongkos kirim</span>
              {isFreeShipping ? (
                <span className="font-medium text-green-600">Gratis</span>
              ) : (
                <span className="font-medium text-gray-900">
                  ~{formatIDR(shippingCost)}
                </span>
              )}
            </div>

            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-lg font-bold text-gray-900">{formatIDR(grandTotal)}</span>
            </div>
          </div>

          <a
            href="/checkout"
            className="mt-6 block w-full rounded-xl bg-accent py-3.5 text-center text-sm font-bold text-white shadow transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
          >
            Lanjut ke Checkout →
          </a>

          {/* Trust badges */}
          <div className="mt-5 space-y-2.5 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span>Pembayaran 100% aman & terenkripsi</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <span>Pengiriman ke seluruh Indonesia</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>Garansi return 7 hari</span>
            </div>
          </div>

          {/* Payment methods */}
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-3 text-xs font-medium text-gray-500">Metode pembayaran</p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              {["BCA", "BNI", "BRI", "Mandiri", "GoPay", "OVO", "QRIS"].map((m) => (
                <span key={m} className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 font-medium">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
