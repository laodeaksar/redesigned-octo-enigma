// =============================================================================
// Order number generator
// Format: ORD-YYYYMMDD-XXXX  (e.g. ORD-20240415-0042)
// Uses MongoDB to count orders created on the same calendar day.
// =============================================================================

import { OrderModel } from "@repo/database/mongo/models/order.model";

/**
 * Generate the next sequential order number for today (UTC).
 * Delegates to the static helper on OrderModel which counts today's orders.
 */
export async function generateOrderNumber(): Promise<string> {
  return OrderModel.generateOrderNumber(new Date());
}

/**
 * Extract the date part from an order number for display.
 * "ORD-20240415-0042" → "2024-04-15"
 */
export function parseOrderDate(orderNumber: string): string | null {
  const match = /^ORD-(\d{4})(\d{2})(\d{2})-/.exec(orderNumber);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

