// =============================================================================
// CartDrawer — React island, client:load
//
// Migration: useCart() + useUpdateCartQty() replaces nanostores $cart/$cartTotal.
// $isCartOpen and requestRemoveFromCart remain as nanostores:
//   $isCartOpen      → UI state (open/close drawer) — not server state
//   requestRemoveFromCart → triggers UndoToast countdown (event signal)
//
// All islands share the same QueryClient singleton → shared cache.
// =============================================================================

import { QueryClientProvider } from "@tanstack/react-query";
import { useStore } from "@nanostores/react";

import { queryClient } from "@/lib/query-client";
import { useCart } from "@/hooks/queries/useCart";
import { useUpdateCartQty } from "@/hooks/mutations/useUpdateCartQty";
import { $isCartOpen, requestRemoveFromCart, setLoggedIn } from "@/stores/cart.store";
import { formatIDR } from "@/lib/utils";

interface Props {
  isLoggedIn?: boolean;
}

function CartDrawerInner({ isLoggedIn = false }: Props) {
  // Keep setLoggedIn so cart.store actions (from AddToCartButton etc.) push to server
  setLoggedIn(isLoggedIn);

  const { items, total, isLoading } = useCart(isLoggedIn);
  const isOpen = useStore($isCartOpen);
  const { mutate: updateQty } = useUpdateCartQty();

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
        className={`fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Keranjang ({items.length} item)
          </h2>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={() => $isCartOpen.set(false)}
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(n => (
                <div key={n} className="flex gap-3 animate-pulse">
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-gray-100" />
                    <div className="h-3 w-1/2 rounded bg-gray-100" />
                    <div className="h-4 w-1/4 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-gray-400">
              <span className="text-5xl">🛒</span>
              <p className="text-sm">Keranjangmu masih kosong</p>
              <a
                className="text-accent mt-2 text-sm font-medium hover:underline"
                href="/products"
                onClick={() => $isCartOpen.set(false)}
              >
                Mulai belanja →
              </a>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map(item => (
                <li className="flex gap-3" key={item.variantId}>
                  {/* Image */}
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                    {item.imageUrl ? (
                      <img
                        alt={item.productName}
                        className="h-full w-full object-cover"
                        src={item.imageUrl}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-gray-200">
                        📦
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {item.productName}
                    </p>
                    <p className="text-xs text-gray-500">{item.variantName}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatIDR(item.price)}
                    </p>

                    <div className="flex items-center gap-2">
                      {/* Quantity stepper */}
                      <div className="flex items-center rounded-md border border-gray-200">
                        <button
                          className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50"
                          onClick={() =>
                            updateQty({
                              variantId: item.variantId,
                              quantity: item.quantity - 1,
                              isLoggedIn,
                            })
                          }
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50"
                          onClick={() =>
                            updateQty({
                              variantId: item.variantId,
                              quantity: item.quantity + 1,
                              isLoggedIn,
                            })
                          }
                        >
                          +
                        </button>
                      </div>

                      <button
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => requestRemoveFromCart(item.variantId)}
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
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">Subtotal</span>
              <span className="text-base font-bold text-gray-900">
                {formatIDR(total)}
              </span>
            </div>
            <a
              className="bg-accent block w-full rounded-lg py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
              href="/checkout"
              onClick={() => $isCartOpen.set(false)}
            >
              Lanjut ke Checkout
            </a>
            <a
              className="mt-2 block w-full rounded-lg border border-gray-200 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              href="/cart"
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

export default function CartDrawer(props: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <CartDrawerInner {...props} />
    </QueryClientProvider>
  );
}
