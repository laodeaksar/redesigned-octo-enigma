// =============================================================================
// Orders controller
// =============================================================================

import { success, paginated } from "@repp/common/schemas";
import { safeParse } from "@repo/common/errors";
import {
  createOrderSchema,
  cancelOrderSchema,
  updateOrderStatusSchema,
  listOrdersQuerySchema,
  myOrdersQuerySchema,
} from "@repo/common/schemas";

import * as service from "./orders.service";
import type { DB } from "@/config";

export async function handleCreate(
  db: DB,
  userId: string,
  userEmail: string,
  body: unknown
) {
  const input = safeParse(createOrderSchema, body);
  const order = await service.createOrder(db, userId, userEmail, input);
  return success(order, "Order created successfully");
}

export async function handleGetById(
  orderId: string,
  requesterId: string,
  requesterRole: string
) {
  return success(await service.getOrderById(orderId, requesterId, requesterRole));
}

export async function handleGetMyOrders(userId: string, query: unknown) {
  const parsed = safeParse(myOrdersQuerySchema, query);
  const { items, total } = await service.getMyOrders(userId, parsed);
  return paginated(items, { total, page: parsed.page, limit: parsed.limit });
}

export async function handleListOrders(query: unknown) {
  const parsed = safeParse(listOrdersQuerySchema, query);
  const { items, total } = await service.listOrders(parsed);
  return paginated(items, { total, page: parsed.page, limit: parsed.limit });
}

export async function handleCancel(
  db: DB,
  orderId: string,
  requesterId: string,
  requesterRole: string,
  userEmail: string,
  body: unknown
) {
  const input = safeParse(cancelOrderSchema, body);
  return success(
    await service.cancelOrder(orderId, requesterId, requesterRole, userEmail, input)
  );
}

export async function handleUpdateStatus(
  orderId: string,
  adminId: string,
  userEmail: string,
  body: unknown
) {
  const input = safeParse(updateOrderStatusSchema, body);
  return success(
    await service.updateOrderStatus(orderId, adminId, userEmail, input),
    "Order status updated"
  );
}

export async function handleMarkPaid(
  orderId: string,
  body: unknown
) {
  const { paymentId } = body as { paymentId: string };
  return success(await service.markOrderPaid(orderId, paymentId));
}

export async function handleExpireOrders() {
  return success(await service.expireStaleOrders());
}

