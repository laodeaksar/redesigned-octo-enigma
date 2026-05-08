// =============================================================================
// Compare store — nanostores + localStorage persistence (max 3 products)
// =============================================================================

import { atom, computed } from "nanostores";

const STORAGE_KEY = "compare_products";
export const MAX_COMPARE = 3;

export interface CompareProduct {
  categoryName?: string | null;
  highestPrice: number;
  id: string;
  lowestPrice: number;
  name: string;
  primaryImage: string | null;
  slug: string;
  tags: string[];
  totalStock: number;
}

function load(): CompareProduct[] {
  if (typeof localStorage === "undefined") {
    return [];
  }
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(items: CompareProduct[]) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const $compareList = atom<CompareProduct[]>([]);
export const $compareOpen = atom(false);

export const $compareCount = computed($compareList, l => l.length);
export const $compareIds = computed($compareList, l => l.map(p => p.id));

export function hydrateCompare() {
  $compareList.set(load());
}

export function addToCompare(product: CompareProduct): boolean {
  const current = $compareList.get();
  if (current.length >= MAX_COMPARE) {
    return false;
  }
  if (current.some(p => p.id === product.id)) {
    return false;
  }
  const updated = [...current, product];
  $compareList.set(updated);
  save(updated);
  return true;
}

export function removeFromCompare(id: string) {
  const updated = $compareList.get().filter(p => p.id !== id);
  $compareList.set(updated);
  save(updated);
}

export function clearCompare() {
  $compareList.set([]);
  save([]);
}

export function isInCompare(id: string): boolean {
  return $compareList.get().some(p => p.id === id);
}
