// =============================================================================
// Wishlist store — nanostores (shared between React islands client-side)
// =============================================================================

import { atom, computed } from "nanostores";

// ── State ─────────────────────────────────────────────────────────────────────

export const $wishlistedIds = atom<Set<string>>(new Set());

// ── Computed ──────────────────────────────────────────────────────────────────

export const $wishlistCount = computed($wishlistedIds, (ids) => ids.size);

// ── Actions ───────────────────────────────────────────────────────────────────

const API = "/api/wishlist";

/** Hydrate wishlist IDs — first from localStorage, then reconcile with server */
export async function hydrateWishlist() {
  try {
    const cached = localStorage.getItem("wishlist");
    if (cached) {
      $wishlistedIds.set(new Set(JSON.parse(cached) as string[]));
    }
  } catch {
    // ignore corrupt storage
  }

  try {
    const res = await fetch(API);
    if (!res.ok) {
      return;
    }
    const { data } = (await res.json()) as {
      data: { items: { product: { id: string } }[] };
    };
    const ids = data.items.map((i) => i.product.id);
    const next = new Set(ids);
    $wishlistedIds.set(next);
    persistWishlist(next);
  } catch {
    // ignore server errors — use cached state
  }
}

/** Optimistic toggle — rolls back if server request fails */
export async function toggleWishlist(productId: string) {
  const prev = new Set($wishlistedIds.get());
  const next = new Set(prev);

  if (next.has(productId)) {
    next.delete(productId);
  } else {
    next.add(productId);
  }

  $wishlistedIds.set(next);
  persistWishlist(next);

  try {
    const res = await fetch(`${API}/${productId}/toggle`, { method: "POST" });
    if (!res.ok) {
      throw new Error("toggle failed");
    }
    const { data } = (await res.json()) as { data: { wishlisted: boolean } };

    // Reconcile with server truth
    const reconciled = new Set($wishlistedIds.get());
    if (data.wishlisted) {
      reconciled.add(productId);
    } else {
      reconciled.delete(productId);
    }
    $wishlistedIds.set(reconciled);
    persistWishlist(reconciled);
  } catch {
    // Rollback on error
    $wishlistedIds.set(prev);
    persistWishlist(prev);
  }
}

// ── Persistence (localStorage) ────────────────────────────────────────────────

function persistWishlist(ids: Set<string>) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("wishlist", JSON.stringify([...ids]));
  }
}
