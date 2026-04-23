// =============================================================================
// Analytics routes (admin only — called internally)
//
//  GET /analytics/summary           — KPI totals (today, this week, this month)
//  GET /analytics/revenue?period=   — daily revenue series for a date range
//  GET /analytics/orders?period=    — daily order count series
//  GET /analytics/top-products      — top selling products by quantity
//  GET /analytics/order-statuses    — breakdown by status
// =============================================================================

import Elysia, { t } from "elysia";
import { success } from "@repo/common/schemas";
import { OrderModel } from "@repo/database/mongo/models/order.model";

export const analyticsRoutes = new Elysia({ prefix: "/analytics" })

  // ── Summary KPIs ────────────────────────────────────────────────────────────
  .get("/summary", async () => {
    const now    = new Date();
    const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week   = new Date(today.getTime() - 7  * 86400_000);
    const month  = new Date(today.getTime() - 30 * 86400_000);

    const [todayStats, weekStats, monthStats, allTime] = await Promise.all([
      aggregatePeriod(today, now),
      aggregatePeriod(week, now),
      aggregatePeriod(month, now),
      aggregatePeriod(new Date(0), now),
    ]);

    return success({
      today:   todayStats,
      week:    weekStats,
      month:   monthStats,
      allTime: allTime,
    });
  }, {
    detail: { tags: ["Analytics"], summary: "KPI summary (admin)" },
  })

  // ── Daily revenue series ────────────────────────────────────────────────────
  .get("/revenue", async ({ query }) => {
    const days  = Math.min(90, Math.max(7, parseInt(query.days ?? "30", 10)));
    const since = new Date(Date.now() - days * 86400_000);

    const series = await OrderModel.aggregate([
      {
        $match: {
          status:    { $in: ["processing", "shipped", "delivered", "completed"] },
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          revenue: { $sum: "$pricing.grandTotal" },
          orders:  { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date:    "$_id",
          revenue: 1,
          orders:  1,
        },
      },
    ]);

    return success(series);
  }, {
    query: t.Object({ days: t.Optional(t.String()) }),
    detail: { tags: ["Analytics"], summary: "Daily revenue series (admin)" },
  })

  // ── Order status breakdown ──────────────────────────────────────────────────
  .get("/order-statuses", async () => {
    const breakdown = await OrderModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
      { $sort: { count: -1 } },
    ]);
    return success(breakdown);
  }, {
    detail: { tags: ["Analytics"], summary: "Order count by status (admin)" },
  })

  // ── Top-selling products ────────────────────────────────────────────────────
  .get("/top-products", async ({ query }) => {
    const limit  = Math.min(20, Math.max(5, parseInt(query.limit ?? "10", 10)));
    const days   = Math.min(90, Math.max(7, parseInt(query.days  ?? "30", 10)));
    const since  = new Date(Date.now() - days * 86400_000);

    const topProducts = await OrderModel.aggregate([
      {
        $match: {
          status:    { $in: ["processing", "shipped", "delivered", "completed"] },
          createdAt: { $gte: since },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id:         "$items.product.productId",
          name:        { $first: "$items.product.name" },
          imageUrl:    { $first: "$items.product.imageUrl" },
          totalQty:    { $sum: "$items.quantity" },
          totalRevenue:{ $sum: "$items.subtotal" },
          orderCount:  { $sum: 1 },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          productId:    "$_id",
          name:         1,
          imageUrl:     1,
          totalQty:     1,
          totalRevenue: 1,
          orderCount:   1,
        },
      },
    ]);

    return success(topProducts);
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
      days:  t.Optional(t.String()),
    }),
    detail: { tags: ["Analytics"], summary: "Top-selling products (admin)" },
  });

// ── Helper ────────────────────────────────────────────────────────────────────

async function aggregatePeriod(from: Date, to: Date) {
  const [result] = await OrderModel.aggregate([
    {
      $match: {
        createdAt: { $gte: from, $lte: to },
        status: { $ne: "cancelled" },
      },
    },
    {
      $group: {
        _id:        null,
        orders:     { $sum: 1 },
        revenue:    { $sum: "$pricing.grandTotal" },
        avgOrderValue: { $avg: "$pricing.grandTotal" },
      },
    },
    { $project: { _id: 0 } },
  ]);

  return result ?? { orders: 0, revenue: 0, avgOrderValue: 0 };
}

