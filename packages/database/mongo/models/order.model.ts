// =============================================================================
// Order Mongoose Model
// Managed by: order-service
// Stored in: MongoDB (orders database)
// =============================================================================

import mongoose, { Schema, model, type Document, type Model } from "mongoose";

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface IProductSnapshot {
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  price: number;
}

export interface IOrderItem {
  product: IProductSnapshot;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface IShippingAddress {
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface IShippingInfo {
  courier: string;
  service: string;
  trackingNumber: string | null;
  estimatedDays: number;
  cost: number;
  address: IShippingAddress;
  shippedAt: Date | null;
  deliveredAt: Date | null;
}

export interface IOrderPricing {
  subtotal: number;
  shippingCost: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
}

export interface IAppliedDiscount {
  code: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: number;
  amount: number;
}

export interface IOrderStatusEvent {
  status: string;
  timestamp: Date;
  note: string | null;
  actorId: string | null;
}

// ── Order Document interface ──────────────────────────────────────────────────

export interface IOrder {
  orderNumber: string;
  userId: string;
  status:
    | "pending_payment"
    | "processing"
    | "shipped"
    | "delivered"
    | "completed"
    | "cancelled"
    | "refund_requested"
    | "refunded";
  items: IOrderItem[];
  shipping: IShippingInfo;
  pricing: IOrderPricing;
  discounts: IAppliedDiscount[];
  paymentId: string | null;
  statusHistory: IOrderStatusEvent[];
  cancellationReason: string | null;
  cancellationNote: string | null;
  customerNote: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderDocument extends IOrder, Document {}

// ── Sub-document Schemas ──────────────────────────────────────────────────────

const ProductSnapshotSchema = new Schema<IProductSnapshot>(
  {
    productId: { type: String, required: true },
    variantId: { type: String, required: true },
    name: { type: String, required: true },
    variantName: { type: String, required: true },
    sku: { type: String, required: true },
    imageUrl: { type: String, default: null },
    price: { type: Number, required: true },
  },
  { _id: false }, // no separate ObjectId for snapshots
);

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: ProductSnapshotSchema, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  },
  { _id: false },
);

const ShippingAddressSchema = new Schema<IShippingAddress>(
  {
    recipientName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    province: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true, default: "ID" },
  },
  { _id: false },
);

const ShippingInfoSchema = new Schema<IShippingInfo>(
  {
    courier: { type: String, required: true },
    service: { type: String, required: true },
    trackingNumber: { type: String, default: null },
    estimatedDays: { type: Number, required: true },
    cost: { type: Number, required: true },
    address: { type: ShippingAddressSchema, required: true },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { _id: false },
);

const OrderPricingSchema = new Schema<IOrderPricing>(
  {
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, required: true },
    discountTotal: { type: Number, required: true, default: 0 },
    taxTotal: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true },
  },
  { _id: false },
);

const AppliedDiscountSchema = new Schema<IAppliedDiscount>(
  {
    code: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["percentage", "fixed_amount", "free_shipping"],
    },
    value: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const OrderStatusEventSchema = new Schema<IOrderStatusEvent>(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, required: true, default: () => new Date() },
    note: { type: String, default: null },
    actorId: { type: String, default: null },
  },
  { _id: false },
);

// ── Order Schema ──────────────────────────────────────────────────────────────

const ORDER_STATUSES = [
  "pending_payment",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "refund_requested",
  "refunded",
] as const;

const OrderSchema = new Schema<IOrderDocument>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      // Format: ORD-YYYYMMDD-XXXX  e.g. ORD-20240415-0042
      match: /^ORD-\d{8}-\d{4,}$/,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ORDER_STATUSES,
      default: "pending_payment",
      index: true,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: "Order must have at least one item",
      },
    },
    shipping: { type: ShippingInfoSchema, required: true },
    pricing: { type: OrderPricingSchema, required: true },
    discounts: { type: [AppliedDiscountSchema], default: [] },
    paymentId: { type: String, default: null, index: true },
    statusHistory: { type: [OrderStatusEventSchema], default: [] },
    cancellationReason: { type: String, default: null },
    cancellationNote: { type: String, default: null },
    customerNote: { type: String, default: null },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL — auto-delete if unpaid?
      // Note: TTL index will delete the document. If you only want to flag
      // it as expired instead, remove this index and use a cron/job.
    },
  },
  {
    timestamps: true, // auto createdAt + updatedAt
    versionKey: false,
    collection: "orders",
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Compound: list orders by user + status (e.g. "my active orders")
OrderSchema.index({ userId: 1, status: 1 });

// Compound: admin dashboard — latest orders first
OrderSchema.index({ status: 1, createdAt: -1 });

// Text search on order number
OrderSchema.index({ orderNumber: "text" });

// ── Static helpers ────────────────────────────────────────────────────────────

interface IOrderModel extends Model<IOrderDocument> {
  /** Generate next sequential order number for a given date */
  generateOrderNumber(date?: Date): Promise<string>;
}

OrderSchema.static(
  "generateOrderNumber",
  async function (date = new Date()): Promise<string> {
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await OrderModel.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const seq = String(count + 1).padStart(4, "0");
    return `ORD-${datePart}-${seq}`;
  },
);

// ── Model export ──────────────────────────────────────────────────────────────

// Prevent OverwriteModelError in hot-reload environments (Bun / Next.js)
export const OrderModel: IOrderModel =
  (mongoose.models["Order"] as IOrderModel) ??
  model<IOrderDocument, IOrderModel>("Order", OrderSchema);
