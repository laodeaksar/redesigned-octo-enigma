// =============================================================================
// Cart store — nanostores (shared between React islands client-side)
//
// Removal flow (undo-safe):
//   1. UI button calls requestRemoveFromCart(variantId)
//      → sets $removeRequested atom (event signal)
//   2. UndoToast subscribes to $removeRequested, shows a 6-second countdown
//   3. On timeout (no undo): UndoToast calls removeFromCart(variantId) to
//      commit the deletion
//   4. On undo: UndoToast calls addToCart(item) to restore, clears the atom
//
// This replaces the previous window.removeFromCartWithUndo global hack.
// =============================================================================

import { atom, computed } from "nanostores";

export interface CartItem {
  imageUrl: string | null;
  price: number;
  productName: string;
  quantity: number;
  sku: string;
  variantId: string;
  variantName: string;
}

// ── State ─────────────────────────────────────────────────────────────────────

export const $cart = atom<CartItem[]>([]);
export const $isCartOpen = atom(false);

// Event atom: set to a variantId when the user requests removal (to show the
// undo toast). UndoToast watches this, starts the countdown, then calls
// removeFromCart() once the window expires.  Cleared automatically after
// UndoToast picks up the event.
export const $removeRequested = atom<string | null>(null);

// ── Computed ──────────────────────────────────────────────────────────────────

export const $cartCount = computed($cart, items =>
  items.reduce((sum, i) => sum + i.quantity, 0)
);

export const $cartTotal = computed($cart, items =>
  items.reduce((sum, i) => sum + i.price * i.quantity, 0)
);

// ── Actions ───────────────────────────────────────────────────────────────────

export function addToCart(item: CartItem) {
  const current = $cart.get();
  const existing = current.find(i => i.variantId === item.variantId);

  if (existing) {
    $cart.set(
      current.map(i =>
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
    // Treat stepper-to-zero the same as a remove button — show undo toast
    requestRemoveFromCart(variantId);
    return;
  }
  $cart.set(
    $cart.get().map(i => (i.variantId === variantId ? { ...i, quantity } : i))
  );
  persistCart();
}

// Signal that the user wants to remove an item.
// UndoToast reacts to this and starts the undo countdown.
// For programmatic removals that should skip the toast (e.g. checkout
// clearing the cart), call removeFromCart() directly.
export function requestRemoveFromCart(variantId: string) {
  $removeRequested.set(variantId);
}

// Commit the removal — called by UndoToast after the undo window expires,
// or directly when no undo is needed (clearCart, quantity stepper bypass).
export function removeFromCart(variantId: string) {
  $cart.set($cart.get().filter(i => i.variantId !== variantId));
  // Clear the event atom if it was still pointing at this item
  if ($removeRequested.get() === variantId) {
    $removeRequested.set(null);
  }
  persistCart();
}

export function clearCart() {
  $cart.set([]);
  $removeRequested.set(null);
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
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    const raw = localStorage.getItem("cart");
    if (raw) {
      $cart.set(JSON.parse(raw) as CartItem[]);
    }
  } catch {
    // ignore corrupt storage
  }
}
