// =============================================================================
// Cart store — nanostores (shared between React islands client-side)
//
// Persistence strategy:
//   - localStorage always used as local cache (works offline + for guests)
//   - Server sync for authenticated users (via /api/proxy/cart)
//
// Removal flow (undo-safe):
//   1. UI button calls requestRemoveFromCart(variantId)
//      → sets $removeRequested atom (event signal)
//   2. UndoToast subscribes to $removeRequested, shows a 6-second countdown
//   3. On timeout (no undo): UndoToast calls removeFromCart(variantId) to
//      commit the deletion
//   4. On undo: UndoToast calls addToCart(item) to restore, clears the atom
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
export const $cartSyncing = atom(false);

// Event atom: set to a variantId when the user requests removal (to show the
// undo toast). UndoToast reacts to this and starts the countdown, then calls
// removeFromCart() once the window expires.
export const $removeRequested = atom<string | null>(null);

// ── Computed ──────────────────────────────────────────────────────────────────

export const $cartCount = computed($cart, items =>
  items.reduce((sum, i) => sum + i.quantity, 0)
);

export const $cartTotal = computed($cart, items =>
  items.reduce((sum, i) => sum + i.price * i.quantity, 0)
);

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

// ── Server-side cart API helpers ──────────────────────────────────────────────

interface ServerCartItem {
  variantId: string;
  quantity: number;
  price: number;
  productName: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
}

interface ServerCart {
  items: ServerCartItem[];
  subtotal: number;
  itemCount: number;
}

function serverItemToCartItem(i: ServerCartItem): CartItem {
  return {
    variantId: i.variantId,
    productName: i.productName,
    variantName: i.variantName,
    sku: i.sku,
    imageUrl: i.imageUrl,
    price: i.price,
    quantity: i.quantity,
  };
}

/**
 * Merge localStorage cart into server and replace local state with server cart.
 * Called once after login so the server becomes the source of truth.
 */
export async function syncCartWithServer(): Promise<void> {
  try {
    $cartSyncing.set(true);
    const localItems = $cart.get();

    // POST /api/proxy/cart/merge with current localStorage items
    const res = await fetch("/api/proxy/cart/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: localItems.map(i => ({
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      }),
    });

    if (!res.ok) {
      // User may not be logged in — fall back to localStorage silently
      return;
    }

    const json = (await res.json()) as { success: true; data: ServerCart };
    const serverItems = json.data.items.map(serverItemToCartItem);
    $cart.set(serverItems);
    persistCart();
  } catch {
    // Network error — stay with localStorage
  } finally {
    $cartSyncing.set(false);
  }
}

/**
 * Fetch server cart and replace local state (no merge — server wins).
 * Used on CartPage mount when already logged in.
 */
export async function fetchServerCart(): Promise<void> {
  try {
    $cartSyncing.set(true);
    const res = await fetch("/api/proxy/cart");

    if (!res.ok) {
      return;
    }

    const json = (await res.json()) as { success: true; data: ServerCart };
    const serverItems = json.data.items.map(serverItemToCartItem);
    $cart.set(serverItems);
    persistCart();
  } catch {
    // Network error — stay with localStorage
  } finally {
    $cartSyncing.set(false);
  }
}

/**
 * Fire-and-forget: push an add-item call to the server.
 * The local store is already updated optimistically before this is called.
 */
async function pushAddToServer(variantId: string, quantity: number) {
  try {
    await fetch("/api/proxy/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, quantity }),
    });
  } catch {
    // Ignore — local store is the source of truth for the current session
  }
}

/**
 * Fire-and-forget: update quantity on server.
 */
async function pushUpdateToServer(variantId: string, quantity: number) {
  try {
    await fetch(`/api/proxy/cart/items/${variantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
  } catch {
    // Ignore
  }
}

/**
 * Fire-and-forget: remove item from server.
 */
async function pushRemoveFromServer(variantId: string) {
  try {
    await fetch(`/api/proxy/cart/items/${variantId}`, {
      method: "DELETE",
    });
  } catch {
    // Ignore
  }
}

/**
 * Fire-and-forget: clear cart on server.
 */
async function pushClearToServer() {
  try {
    await fetch("/api/proxy/cart", { method: "DELETE" });
  } catch {
    // Ignore
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────

/** isLoggedIn flag is set by islands that receive it as a prop from SSR */
let _isLoggedIn = false;
export function setLoggedIn(value: boolean) {
  _isLoggedIn = value;
}

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

  if (_isLoggedIn) {
    void pushAddToServer(item.variantId, item.quantity);
  }
}

export function updateQuantity(variantId: string, quantity: number) {
  if (quantity <= 0) {
    requestRemoveFromCart(variantId);
    return;
  }
  $cart.set(
    $cart.get().map(i => (i.variantId === variantId ? { ...i, quantity } : i))
  );
  persistCart();

  if (_isLoggedIn) {
    void pushUpdateToServer(variantId, quantity);
  }
}

export function requestRemoveFromCart(variantId: string) {
  $removeRequested.set(variantId);
}

export function removeFromCart(variantId: string) {
  $cart.set($cart.get().filter(i => i.variantId !== variantId));
  if ($removeRequested.get() === variantId) {
    $removeRequested.set(null);
  }
  persistCart();

  if (_isLoggedIn) {
    void pushRemoveFromServer(variantId);
  }
}

export function clearCart() {
  $cart.set([]);
  $removeRequested.set(null);
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("cart");
  }

  if (_isLoggedIn) {
    void pushClearToServer();
  }
}
