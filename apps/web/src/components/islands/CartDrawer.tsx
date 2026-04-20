// =============================================================================
// CartDrawer — React island, client:load
// =============================================================================

import React from "react";
import { useStore } from "@nanostores/react";
import {
  $cart,
  $isCartOpen,
  $cartTotal,
  updateQuantity,
  removeFromCart,
} from "@/stores/cart.store";
import { formatIDR } from "@/lib/utils";

export default function CartDrawer() {
  const cart = useStore($cart);
  const isOpen = useStore($isCartOpen);
  const total = useStore($cartTotal);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => $isCartOpen.set(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Keranjang ({cart.length} item)
          </h2>
          <button
            onClick={() => $isCartOpen.set(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-gray-400">
              <span className="text-5xl">🛒</span>
              <p className="text-sm">Keranjangmu masih kosong</p>
              <a
                href="/products"
                className="mt-2 text-sm font-medium text-accent hover:underline"
                onClick={() => $isCartOpen.set(false)}
              >
                Mulai belanja →
              </a>
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.map((item) => (
                <li key={item.variantId} className="flex gap-3">
                  {/* Image */}
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-gray-200">📦</div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{item.productName}</p>
                    <p className="text-xs text-gray-500">{item.variantName}</p>
                    <p className="text-sm font-semibold text-gray-900">{formatIDR(item.price)}</p>

                    <div className="flex items-center gap-2">
                      {/* Quantity */}
                      <div className="flex items-center rounded-md border border-gray-200">
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50"
                        >−</button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50"
                        >+</button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.variantId)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">Subtotal</span>
              <span className="text-base font-bold text-gray-900">{formatIDR(total)}</span>
            </div>
            <a
              href="/checkout"
              className="block w-full rounded-lg bg-accent py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
              onClick={() => $isCartOpen.set(false)}
            >
              Lanjut ke Checkout
            </a>
            <a
              href="/cart"
              className="mt-2 block w-full rounded-lg border border-gray-200 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => $isCartOpen.set(false)}
            >
              Lihat Keranjang
            </a>
          </div>
        )}
      </div>
    </>
  );
}

