// =============================================================================
// @repo/database — top-level barrel
//
// Prefer sub-path imports for better tree-shaking:
//   import { createDrizzleClient } from "@repo/database/drizzle"
//   import * as schema             from "@repo/database/drizzle/schema"
//   import { connectMongo }        from "@repo/database/mongo"
//   import { OrderModel }          from "@repo/database/mongo/models"
// =============================================================================

export type { DrizzleClient, DrizzleClientOptions } from "./drizzle/client";
// ── Drizzle ───────────────────────────────────────────────────────────────────
export {
  closeDrizzleClient,
  createDrizzleClient,
} from "./drizzle/client";

// ── Drizzle schema ────────────────────────────────────────────────────────────
export * from "./drizzle/schema";
export type { MongoClientOptions } from "./mongo/client";
// ── MongoDB ───────────────────────────────────────────────────────────────────
export {
  connectMongo,
  disconnectMongo,
  isMongoConnected,
} from "./mongo/client";
export type {
  IAppliedDiscount,
  IOrder,
  IOrderDocument,
  IOrderItem,
  IOrderPricing,
  IOrderStatusEvent,
  IProductSnapshot,
  IShippingAddress,
  IShippingInfo,
} from "./mongo/models/order.model";
// ── MongoDB models ────────────────────────────────────────────────────────────
export { OrderModel } from "./mongo/models/order.model";
