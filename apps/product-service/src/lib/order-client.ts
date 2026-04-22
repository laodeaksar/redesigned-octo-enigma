// =============================================================================
// Order Service HTTP client (internal)
// Used by product-service to verify a user purchased a product
// before allowing them to submit a review.
// =============================================================================

import { env } from "@/config";

const BASE = (env as Record<string, string>)["ORDER_SERVICE_URL"]?.replace(/\/$/, "") ?? "";

/**
 * Check whether a user has a completed/delivered order containing a
 * specific product variant for the given orderId.
 *
 * Returns true if the order:
 *   - belongs to the user
 *   - contains the product
 *   - has status "delivered" or "completed"
 */
export async function verifyPurchase(
  userId: string,
  productId: string,
  orderId: string
): Promise<boolean> {
  // If ORDER_SERVICE_URL is not configured, skip verification
  // (allows local dev without order-service running)
  if (!BASE) {
    console.warn("[order-client] ORDER_SERVICE_URL not set — skipping purchase verification");
    return true;
  }

  try {
    const res = await fetch(
      `${BASE}/orders/${orderId}/verify-purchase?userId=${userId}&productId=${productId}`,
      {
        method: "GET",
        headers: {
          "x-internal-service": "product-service",
        },
        signal: AbortSignal.timeout(3000), // 3s timeout — don't block reviews
      }
    );

    if (!res.ok) return false;

    const body = await res.json() as { data: { verified: boolean } };
    return body.data?.verified === true;
  } catch (err) {
    // Network failure — fail open with warning rather than blocking all reviews
    console.warn(
      "[order-client] Purchase verification failed (fail-open):",
      err instanceof Error ? err.message : String(err)
    );
    return true;
  }
}

