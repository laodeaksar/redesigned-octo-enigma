// =============================================================================
// Product Service HTTP client
// Used by order-service to validate stock + fetch product snapshots
// =============================================================================

import { ServiceUnavailableError, InsufficientStockError } from "@repo/common/errors";
import type { ProductSnapshot } from "@repo/common/types";
import { env } from "@/config";

const BASE = env.PRODUCT_SERVICE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VariantStockInfo {
  variantId: string;
  productId: string;
  name: string;               // product name
  variantName: string;
  sku: string;
  imageUrl: string | null;
  price: number;
  stock: number;
}

export interface BatchDeductRequest {
  orderId: string;
  items: Array<{ variantId: string; quantity: number }>;
}

// ── Internal fetch helper ─────────────────────────────────────────────────────

async function internalFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE}${path}`;
  let res: Response;

  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-internal-service": "order-service",
        ...options.headers,
      },
    });
  } catch (err) {
    throw new ServiceUnavailableError("product-service", err);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const error = body["error"] as { code?: string; message?: string } | undefined;

    if (error?.code === "INSUFFICIENT_STOCK") {
      throw new InsufficientStockError(
        String((body["meta"] as Record<string, unknown> | undefined)?.["variantId"] ?? ""),
        Number((body["meta"] as Record<string, unknown> | undefined)?.["requested"] ?? 0),
        Number((body["meta"] as Record<string, unknown> | undefined)?.["available"] ?? 0)
      );
    }

    throw new ServiceUnavailableError(
      `product-service: ${error?.message ?? res.statusText}`
    );
  }

  const json = await res.json() as { data: T };
  return json.data;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch variant details for a list of variant IDs.
 * Used to validate existence + build product snapshots at order creation.
 */
export async function getVariantsByIds(
  variantIds: string[]
): Promise<VariantStockInfo[]> {
  const params = new URLSearchParams();
  variantIds.forEach((id) => params.append("ids", id));

  return internalFetch<VariantStockInfo[]>(
    `/products/variants?${params.toString()}`
  );
}

/**
 * Build a ProductSnapshot from variant info — stored inside the order document.
 */
export function toProductSnapshot(
  variant: VariantStockInfo,
  price: number
): ProductSnapshot {
  return {
    productId: variant.productId,
    variantId: variant.variantId,
    name: variant.name,
    variantName: variant.variantName,
    sku: variant.sku,
    imageUrl: variant.imageUrl,
    price,
  };
}

/**
 * Atomically deduct stock for all items in an order.
 * Throws InsufficientStockError if any variant has insufficient stock.
 */
export async function batchDeductStock(
  input: BatchDeductRequest
): Promise<void> {
  await internalFetch("/products/stock/batch-deduct", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Restore stock after order cancellation.
 * Uses the stock adjustment endpoint with a positive delta per item.
 */
export async function restoreStock(
  orderId: string,
  items: Array<{ variantId: string; quantity: number }>
): Promise<void> {
  await Promise.all(
    items.map((item) =>
      internalFetch("/products/stock/adjust", {
        method: "POST",
        body: JSON.stringify({
          variantId: item.variantId,
          delta: item.quantity,
          reason: "order_cancelled",
          referenceId: orderId,
        }),
      })
    )
  );
}

