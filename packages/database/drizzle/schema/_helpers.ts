// =============================================================================
// Shared Drizzle column helpers
// =============================================================================

import { sql } from "drizzle-orm";
import { pgEnum, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

// ── Reusable column factories ─────────────────────────────────────────────────

/** Auto-generated UUID primary key */
export const primaryId = () =>
  uuid("id").primaryKey().defaultRandom();

/** Standard created_at + updated_at timestamps */
export const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Soft-delete column */
export const softDelete = () => ({
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ── Shared Enums ──────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "customer",
  "admin",
  "super_admin",
]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "inactive",
  "banned",
  "pending_verification",
]);

export const oauthProviderEnum = pgEnum("oauth_provider", [
  "google",
  "github",
]);

export const productStatusEnum = pgEnum("product_status", [
  "active",
  "draft",
  "archived",
]);

export const stockAdjustmentReasonEnum = pgEnum("stock_adjustment_reason", [
  "order_placed",
  "order_cancelled",
  "order_returned",
  "manual_adjustment",
  "restock",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "challenge",
  "capture",
  "settlement",
  "deny",
  "cancel",
  "expire",
  "failure",
  "refund",
  "partial_refund",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "bank_transfer_bca",
  "bank_transfer_bni",
  "bank_transfer_bri",
  "bank_transfer_mandiri",
  "bank_transfer_permata",
  "gopay",
  "shopeepay",
  "dana",
  "ovo",
  "qris",
  "credit_card",
  "cstore_indomaret",
  "cstore_alfamart",
  "akulaku",
  "kredivo",
]);

export const discountTypeEnum = pgEnum("discount_type", [
  "percentage",
  "fixed_amount",
  "free_shipping",
]);
