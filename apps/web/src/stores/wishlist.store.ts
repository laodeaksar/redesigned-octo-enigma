// =============================================================================
// Wishlist Store — Nanostores dengan persistence
// Mengikuti pola dan standar yang sama persis dengan cart.store.ts
// =============================================================================

import { atom, computed } from "nanostores";
import { addToCart, type CartItem } from "./cart.store";

export interface WishlistItem {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  price: number;
  addedAt: number;
}

// ── State ─────────────────────────────────────────────────────────────────────

export const $wishlist = atom<WishlistItem[]>([]);

// ── Computed ──────────────────────────────────────────────────────────────────

export const $wishlistCount = computed($wishlist, (items) => items.length);

export const $wishlistTotal = computed($wishlist, (items) =>
  items.reduce((sum, i) => sum + i.price, 0)
);

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Tambahkan item ke wishlist
 */
export function addToWishlist(item: Omit<WishlistItem, "addedAt">) {
  const current = $wishlist.get();
  const existing = current.find((i) => i.variantId === item.variantId);

  if (existing) return;

  $wishlist.set([
    ...current,
    {
      ...item,
      addedAt: Date.now()
    }
  ]);

  persistWishlist();
}

/**
 * Hapus item dari wishlist
 */
export function removeFromWishlist(variantId: string, withUndo: boolean = true) {
  if (withUndo && typeof window !== "undefined") {
    // @ts-expect-error undo handler di-inject oleh WishlistUndoToast component
    if (window.removeFromWishlistWithUndo) {
      // @ts-expect-error
      window.removeFromWishlistWithUndo(variantId);
      return;
    }
  }

  $wishlist.set($wishlist.get().filter((i) => i.variantId !== variantId));
  persistWishlist();
}

/**
 * Toggle status wishlist item
 */
export function toggleWishlist(item: Omit<WishlistItem, "addedAt">): boolean {
  const current = $wishlist.get();
  const existing = current.find((i) => i.variantId === item.variantId);

  if (existing) {
    removeFromWishlist(item.variantId);
    return false;
  } else {
    addToWishlist(item);
    return true;
  }
}

/**
 * Cek apakah produk sudah ada di wishlist
 */
export function isInWishlist(variantId: string): boolean {
  return $wishlist.get().some(i => i.variantId === variantId);
}

/**
 * Pindahkan item dari wishlist ke keranjang
 */
export function moveToCart(variantId: string): boolean {
  const current = $wishlist.get();
  const item = current.find(i => i.variantId === variantId);

  if (!item) return false;

  addToCart({
    variantId: item.variantId,
    productName: item.productName,
    variantName: item.variantName,
    sku: item.sku,
    imageUrl: item.imageUrl,
    price: item.price,
    quantity: 1
  });

  removeFromWishlist(variantId, false);
  return true;
}

/**
 * Hapus semua item wishlist
 */
export function clearWishlist() {
  $wishlist.set([]);
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("wishlist");
  }
}

// ── Persistence (localStorage) ────────────────────────────────────────────────

function persistWishlist() {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("wishlist", JSON.stringify($wishlist.get()));
  }
}

export function hydrateWishlist() {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem("wishlist");
    if (raw) $wishlist.set(JSON.parse(raw) as WishlistItem[]);
  } catch {
    // ignore corrupt storage
  }
}
