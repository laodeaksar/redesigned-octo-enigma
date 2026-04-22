// =============================================================================
// Payments controller
// =============================================================================

import { success, paginated } from "@repo/common/schemas";
import { safeParse } from "@repo/common/errors";
import {
  createPaymentSchema,
  midtransNotificationSchema,
  createRefundSchema,
  listPaymentsQuerySchema,
} from "@repo/common/schemas";

import * as service from "./payments.service";
import type { DB } from "@/config";

export async function handleCreate(
  db: DB,
  userId: string,
  userEmail: string,
  body: unknown,
) {
  const input = safeParse(createPaymentSchema, body);
  const payment = await service.createPayment(db, userId, userEmail, input);
  return success(payment, "Payment initiated");
}

export async function handleWebhook(db: DB, body: unknown) {
  const notification = safeParse(midtransNotificationSchema, body);
  const result = await service.handleWebhook(db, notification);
  // Always return 200 to prevent Midtrans retries, even if processing failed
  return success(result);
}

export async function handleGetById(
  db: DB,
  paymentId: string,
  requesterId: string,
  requesterRole: string,
) {
  return success(
    await service.getPaymentById(db, paymentId, requesterId, requesterRole),
  );
}

export async function handleGetByOrderId(
  db: DB,
  orderId: string,
  requesterId: string,
  requesterRole: string,
) {
  return success(
    await service.getPaymentByOrderId(db, orderId, requesterId, requesterRole),
  );
}

export async function handleList(db: DB, query: unknown) {
  const parsed = safeParse(listPaymentsQuerySchema, query);
  const { items, total } = await service.listPayments(db, parsed);
  return paginated(items, { total, page: parsed.page, limit: parsed.limit });
}

export async function handleRefund(db: DB, body: unknown) {
  const input = safeParse(createRefundSchema, body);
  return success(await service.requestRefund(db, input), "Refund initiated");
}
