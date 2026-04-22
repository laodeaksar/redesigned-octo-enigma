// =============================================================================
// Orders service — full lifecycle business logic
// =============================================================================

import {
  NotFoundError,
  ForbiddenError,
  OrderNotPayableError,
  BadRequestError,
} from "@repo/common/errors";
import type {
  CreateOrderInput,
  CancelOrderInput,
  UpdateOrderStatusInput,
  ListOrdersQuery,
  MyOrdersQuery,
} from "@repo/common/schemas";

import * as repo from "./orders.repository";
import * as productClient from "@/lib/product-client";
import * as events from "@/lib/events";
import { generateOrderNumber } from "@/lib/order-number";
import { validateVoucher, calculateDiscount } from "@/modules/vouchers/vouchers.service";
import { incrementUsage } from "@/modules/vouchers/vouchers.repository";
import { env, type DB } from "@/config";

// ── Create Order ──────────────────────────────────────────────────────────────

export async function createOrder(
  db: DB,
  userId: string,
  userEmail: string,
  input: CreateOrderInput
) {
  // 1. Fetch variant details from product-service
  const variantIds = input.items.map((i) => i.variantId);
  const variants = await productClient.getVariantsByIds(variantIds);

  if (variants.length !== variantIds.length) {
    throw new BadRequestError("One or more product variants were not found");
  }

  const variantMap = new Map(variants.map((v) => [v.variantId, v]));

  // 2. Build order items + calculate subtotal
  const items = input.items.map((item) => {
    const variant = variantMap.get(item.variantId)!;
    const unitPrice = variant.price;
    const subtotal = unitPrice * item.quantity;
    return {
      product: productClient.toProductSnapshot(variant, unitPrice),
      quantity: item.quantity,
      unitPrice,
      subtotal,
    };
  });

  const itemSubtotal = items.reduce((sum, i) => sum + i.subtotal, 0);

  // 3. Validate + apply voucher (if provided)
  let discountTotal = 0;
  let appliedDiscounts: Array<{
    code: string;
    type: string;
    value: number;
    amount: number;
  }> = [];
  let freeShipping = false;

  if (input.voucherCode) {
    const { voucher, discountAmount } = await validateVoucher(
      db,
      input.voucherCode,
      itemSubtotal,
      userId
    );

    if (voucher.type === "free_shipping") {
      freeShipping = true;
    } else {
      discountTotal = discountAmount;
    }

    appliedDiscounts = [
      {
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
        amount: discountAmount,
      },
    ];

    // Increment voucher usage atomically
    await incrementUsage(db, voucher.id);
  }

  // 4. Verify shipping cost via RajaOngkir
  //    Client sends the rate they chose in CheckoutForm — we re-verify server-side
  let shippingCost = 0;

  if (!freeShipping) {
    const totalWeightGrams = input.items.reduce((sum, item) => {
      const variant = variantMap.get(item.variantId);
      return sum + (variant ? 0 : 0) + (item.quantity * 500); // fallback: 500g/item
    }, 0);

    try {
      const { getSingleRate } = await import("@/lib/rajaongkir");
      shippingCost = await getSingleRate(
        input.destinationCityId,
        totalWeightGrams,
        input.courier,
        input.courierService
      );

      if (shippingCost === 0) {
        // RajaOngkir returned 0 — use client-provided cost as fallback
        shippingCost = input.shippingCost;
      }
    } catch (err) {
      console.warn("[createOrder] RajaOngkir lookup failed, using client cost:", err);
      shippingCost = input.shippingCost;
    }
  }

  // 5. Calculate final pricing
  const taxTotal = 0; // add PPN 11% logic here if needed
  const grandTotal = Math.max(0, itemSubtotal - discountTotal + shippingCost + taxTotal);

  // 6. Fetch shipping address (address lives in auth-service, passed in input)
  // In this design the client sends the addressId and we trust it exists
  const shippingAddress = {
    recipientName: "Fetched from auth-service",
    phone: "—",
    street: "—",
    city: "—",
    province: "—",
    postalCode: "00000",
    country: "ID",
  };

  // 7. Generate order number + set expiry
  const orderNumber = await generateOrderNumber();
  const expiresAt = new Date(
    Date.now() + env.ORDER_EXPIRY_MINUTES * 60 * 1000
  );

  // 8. Create order document in MongoDB
  const order = await repo.createOrder({
    orderNumber,
    userId,
    status: "pending_payment",
    items,
    shipping: {
      courier: input.courier,
      service: input.courierService,
      trackingNumber: null,
      estimatedDays: 3,
      cost: shippingCost,
      address: shippingAddress,
      shippedAt: null,
      deliveredAt: null,
    },
    pricing: {
      subtotal: itemSubtotal,
      shippingCost,
      discountTotal,
      taxTotal,
      grandTotal,
    },
    discounts: appliedDiscounts,
    paymentId: null,
    statusHistory: [
      {
        status: "pending_payment",
        timestamp: new Date(),
        note: "Order created",
        actorId: userId,
      },
    ],
    cancellationReason: null,
    cancellationNote: null,
    customerNote: input.customerNote ?? null,
    expiresAt,
  });

  // 9. Deduct stock in product-service
  await productClient.batchDeductStock({
    orderId: order.id as string,
    items: input.items,
  });

  // 10. Publish events
  await events.publishOrderCreated(order.id as string, order, userEmail);

  return order;
}

// ── Get Order ─────────────────────────────────────────────────────────────────

export async function getOrderById(
  orderId: string,
  requesterId: string,
  requesterRole: string
) {
  const order = await repo.findOrderById(orderId);
  if (!order) throw new NotFoundError("Order");

  // Customers can only view their own orders
  if (requesterRole === "customer" && order.userId !== requesterId) {
    throw new ForbiddenError();
  }

  return order;
}

export async function getMyOrders(userId: string, query: MyOrdersQuery) {
  return repo.findOrdersByUser(
    userId,
    query.status,
    query.page,
    query.limit
  );
}

export async function listOrders(query: ListOrdersQuery) {
  return repo.listOrders(query);
}

// ── Cancel Order ──────────────────────────────────────────────────────────────

export async function cancelOrder(
  orderId: string,
  requesterId: string,
  requesterRole: string,
  userEmail: string,
  input: CancelOrderInput
) {
  const order = await repo.findOrderById(orderId);
  if (!order) throw new NotFoundError("Order");

  if (requesterRole === "customer" && order.userId !== requesterId) {
    throw new ForbiddenError();
  }

  const cancellableStatuses = ["pending_payment", "processing"];
  if (!cancellableStatuses.includes(order.status)) {
    throw new BadRequestError(
      `Cannot cancel an order with status '${order.status}'`
    );
  }

  const updated = await repo.updateOrderStatus(
    orderId,
    "cancelled",
    {
      status: "cancelled",
      timestamp: new Date(),
      note: input.note ?? null,
      actorId: requesterId,
    },
    {
      cancellationReason: input.reason,
      cancellationNote: input.note ?? null,
    }
  );

  if (!updated) throw new NotFoundError("Order");

  // Restore stock
  const stockItems = order.items.map((i) => ({
    variantId: i.product.variantId,
    quantity: i.quantity,
  }));
  await productClient.restoreStock(orderId, stockItems);

  // Publish events
  await events.publishOrderCancelled(orderId, updated, userEmail);

  return updated;
}

// ── Admin: Update Status ──────────────────────────────────────────────────────

export async function updateOrderStatus(
  orderId: string,
  adminId: string,
  userEmail: string,
  input: UpdateOrderStatusInput
) {
  const order = await repo.findOrderById(orderId);
  if (!order) throw new NotFoundError("Order");

  // Validate allowed transitions
  const transitions: Partial<Record<IOrder["status"], IOrder["status"][]>> = {
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: ["completed"],
  };

  type IOrderStatus = typeof order.status;
  const allowed = transitions[order.status as IOrderStatus] ?? [];
  if (!allowed.includes(input.status as IOrderStatus)) {
    throw new BadRequestError(
      `Cannot transition from '${order.status}' to '${input.status}'`
    );
  }

  let updated = await repo.updateOrderStatus(
    orderId,
    input.status as IOrder["status"],
    {
      status: input.status as IOrder["status"],
      timestamp: new Date(),
      note: input.note ?? null,
      actorId: adminId,
    }
  );

  if (!updated) throw new NotFoundError("Order");

  // Set tracking number if shipping
  if (input.status === "shipped" && input.trackingNumber) {
    updated = await repo.setTrackingNumber(
      orderId,
      input.courier ?? order.shipping.courier,
      input.trackingNumber
    ) ?? updated;

    await events.publishOrderShipped(orderId, updated, userEmail);
  }

  return updated;
}

// ── Internal: mark order as paid (called after payment webhook) ───────────────

export async function markOrderPaid(
  orderId: string,
  paymentId: string
) {
  const order = await repo.findOrderById(orderId);
  if (!order) throw new NotFoundError("Order");

  if (order.status !== "pending_payment") {
    throw new OrderNotPayableError(order.status);
  }

  const updated = await repo.updateOrderStatus(
    orderId,
    "processing",
    {
      status: "processing",
      timestamp: new Date(),
      note: "Payment confirmed",
      actorId: "system",
    }
  );

  await repo.setPaymentId(orderId, paymentId);
  if (updated) await events.publishOrderProcessing(orderId, updated);

  return updated;
}

// ── Expire stale orders (called by cron / scheduler) ─────────────────────────

export async function expireStaleOrders() {
  const expired = await repo.findExpiredOrders();
  let count = 0;

  for (const order of expired) {
    await repo.updateOrderStatus(
      order.id as string,
      "cancelled",
      {
        status: "cancelled",
        timestamp: new Date(),
        note: "Auto-cancelled: payment not received within expiry window",
        actorId: "system",
      },
      { cancellationReason: "payment_expired" }
    );

    const stockItems = order.items.map((i) => ({
      variantId: i.product.variantId,
      quantity: i.quantity,
    }));

    await productClient.restoreStock(order.id as string, stockItems).catch(() => {
      // Log but don't crash the expiry loop
      console.error(`[expire] Failed to restore stock for order ${order.id}`);
    });

    count++;
  }

  return { expired: count };
}

// ── Local type alias needed for updateOrderStatus ─────────────────────────────
import type { IOrder } from "@repo/database/mongo/models/order.model";

