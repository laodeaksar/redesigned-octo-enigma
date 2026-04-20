// =============================================================================
// Orders repository — MongoDB via Mongoose
// =============================================================================

import type { FilterQuery } from "mongoose";

import {
  OrderModel,
  type IOrder,
  type IOrderDocument,
  type IOrderStatusEvent,
} from "@repo/database/mongo/models/order.model";
import type { ListOrdersQuery } from "@repo/common/schemas";

// ── Queries ───────────────────────────────────────────────────────────────────

export async function findOrderById(
  id: string
): Promise<IOrderDocument | null> {
  return OrderModel.findById(id);
}

export async function findOrderByNumber(
  orderNumber: string
): Promise<IOrderDocument | null> {
  return OrderModel.findOne({ orderNumber });
}

export async function findOrdersByUser(
  userId: string,
  status?: string,
  page = 1,
  limit = 10
): Promise<{ items: IOrderDocument[]; total: number }> {
  const filter: FilterQuery<IOrderDocument> = { userId };
  if (status) filter["status"] = status;

  const [items, total] = await Promise.all([
    OrderModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    OrderModel.countDocuments(filter),
  ]);

  return { items, total };
}

export async function listOrders(
  query: ListOrdersQuery
): Promise<{ items: IOrderDocument[]; total: number }> {
  const filter: FilterQuery<IOrderDocument> = {};

  if (query.status) filter["status"] = query.status;
  if (query.userId) filter["userId"] = query.userId;

  if (query.search) {
    filter["$or"] = [{ orderNumber: new RegExp(query.search, "i") }];
  }

  if (query.dateRange?.from || query.dateRange?.to) {
    filter["createdAt"] = {};
    if (query.dateRange.from) filter["createdAt"]["$gte"] = new Date(query.dateRange.from);
    if (query.dateRange.to) filter["createdAt"]["$lte"] = new Date(query.dateRange.to);
  }

  if (query.minTotal || query.maxTotal) {
    filter["pricing.grandTotal"] = {};
    if (query.minTotal) filter["pricing.grandTotal"]["$gte"] = query.minTotal;
    if (query.maxTotal) filter["pricing.grandTotal"]["$lte"] = query.maxTotal;
  }

  const sortField =
    query.sortBy === "grandTotal" ? "pricing.grandTotal" :
    query.sortBy === "orderNumber" ? "orderNumber" :
    query.sortBy === "updatedAt" ? "updatedAt" :
    "createdAt";

  const sortDir = query.sortOrder === "asc" ? 1 : -1;
  const offset = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    OrderModel.find(filter)
      .sort({ [sortField]: sortDir })
      .skip(offset)
      .limit(query.limit),
    OrderModel.countDocuments(filter),
  ]);

  return { items, total };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createOrder(
  data: Omit<IOrder, "createdAt" | "updatedAt">
): Promise<IOrderDocument> {
  return OrderModel.create(data);
}

export async function updateOrderStatus(
  id: string,
  status: IOrder["status"],
  event: IOrderStatusEvent,
  extra?: Partial<IOrder>
): Promise<IOrderDocument | null> {
  return OrderModel.findByIdAndUpdate(
    id,
    {
      $set: { status, updatedAt: new Date(), ...extra },
      $push: { statusHistory: event },
    },
    { new: true }
  );
}

export async function setPaymentId(
  id: string,
  paymentId: string
): Promise<IOrderDocument | null> {
  return OrderModel.findByIdAndUpdate(
    id,
    { $set: { paymentId, updatedAt: new Date() } },
    { new: true }
  );
}

export async function setTrackingNumber(
  id: string,
  courier: string,
  trackingNumber: string
): Promise<IOrderDocument | null> {
  return OrderModel.findByIdAndUpdate(
    id,
    {
      $set: {
        "shipping.trackingNumber": trackingNumber,
        "shipping.courier": courier,
        "shipping.shippedAt": new Date(),
        updatedAt: new Date(),
      },
    },
    { new: true }
  );
}

/** Find all pending_payment orders past their expiry time */
export async function findExpiredOrders(): Promise<IOrderDocument[]> {
  return OrderModel.find({
    status: "pending_payment",
    expiresAt: { $lt: new Date() },
  });
}

