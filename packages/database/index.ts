// =============================================================================
// @my-ecommerce/database — top-level barrel
//
// Prefer sub-path imports for better tree-shaking:
//   import { createDrizzleClient } from "@my-ecommerce/database/drizzle"
//   import * as schema             from "@my-ecommerce/database/drizzle/schema"
//   import { connectMongo }        from "@my-ecommerce/database/mongo"
//   import { OrderModel }          from "@my-ecommerce/database/mongo/models"
// =============================================================================

// ── Drizzle ───────────────────────────────────────────────────────────────────
export {
  createDrizzleClient,
  closeDrizzleClient,
} from "./drizzle/client"
export type { DrizzleClient, DrizzleClientOptions } from "./drizzle/client";

// ── Drizzle schema ────────────────────────────────────────────────────────────
export * from "./drizzle/schema";

// ── MongoDB ───────────────────────────────────────────────────────────────────
export {
  connectMongo,
  disconnectMongo,
  isMongoConnected,
} from "./mongo/client";
export type { MongoClientOptions } from "./mongo/client";

// ── MongoDB models ────────────────────────────────────────────────────────────
export { OrderModel } from "./mongo/models/order.model";
export type {
  IOrder,
  IOrderDocument,
  IOrderItem,
  IProductSnapshot,
  IShippingInfo,
  IShippingAddress,
  IOrderPricing,
  IAppliedDiscount,
  IOrderStatusEvent,
} from "./mongo/models/order.model";
