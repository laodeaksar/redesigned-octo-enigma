// =============================================================================
// Cart store — nanostores (shared between React islands client-side)
// =============================================================================

import { atom, computed } from "nanostores";

export interface CartItem {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  price: number;
  quantity: number;
}

// ── State ─────────────────────────────────────────────────────────────────────

export const $cart = atom<CartItem[]>([]);
export const $isCartOpen = atom(false);

// ── Computed ──────────────────────────────────────────────────────────────────

export const $cartCount = computed($cart, (items) =>
  items.reduce((sum, i) => sum + i.quantity, 0)
);

export const $cartTotal = computed($cart, (items) =>
  items.reduce((sum, i) => sum + i.price * i.quantity, 0)
);

// ── Actions ───────────────────────────────────────────────────────────────────

export function addToCart(item: CartItem) {
  const current = $cart.get();
  const existing = current.find((i) => i.variantId === item.variantId);

  if (existing) {
    $cart.set(
      current.map((i) =>
        i.variantId === item.variantId
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      )
    );
  } else {
    $cart.set([...current, item]);
  }

  $isCartOpen.set(true);
  persistCart();
}

export function updateQuantity(variantId: string, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(variantId);
    return;
  }
  $cart.set(
    $cart.get().map((i) =>
      i.variantId === variantId ? { ...i, quantity } : i
    )
  );
  persistCart();
}

export function removeFromCart(variantId: string, withUndo: boolean = true) {
  if (withUndo && typeof window !== "undefined") {
    // @ts-expect-error undo handler di-inject oleh UndoToast component
    if (window.removeFromCartWithUndo) {
      // @ts-expect-error
      window.removeFromCartWithUndo(variantId);
      return;
    }
  }
  
  $cart.set($cart.get().filter((i) => i.variantId !== variantId));
  persistCart();
}

export function clearCart() {
  $cart.set([]);
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("cart");
  }
}

// ── Persistence (localStorage) ────────────────────────────────────────────────

function persistCart() {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("cart", JSON.stringify($cart.get()));
  }
}

export function hydrateCart() {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem("cart");
    if (raw) $cart.set(JSON.parse(raw) as CartItem[]);
  } catch {
    // ignore corrupt storage
  }
}

