// =============================================================================
// vouchers table
// Managed by: order-service (validation) / admin (CRUD)
// =============================================================================

import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId, discountTypeEnum, timestamps } from "./_helpers";

export const vouchersTable = pgTable(
  "vouchers",
  {
    id: primaryId(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    description: varchar("description", { length: 255 }),
    type: discountTypeEnum("type").notNull(),
    /** Percentage (0–100) or fixed IDR amount, depending on type */
    value: integer("value").notNull(),
    /** Minimum order subtotal in IDR required to use this voucher */
    minimumOrderAmount: integer("minimum_order_amount").notNull().default(0),
    /** Maximum discount amount in IDR (caps percentage discounts) */
    maximumDiscountAmount: integer("maximum_discount_amount"),
    /** Null = unlimited total usage */
    usageLimit: integer("usage_limit"),
    /** How many times this voucher has been used */
    usageCount: integer("usage_count").notNull().default(0),
    /** Max times a single user can use this voucher */
    perUserLimit: integer("per_user_limit").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    /** Restrict to specific user IDs — null = public voucher */
    restrictedToUserId: uuid("restricted_to_user_id"),
    ...timestamps(),
}, (t) => ({
  codeIdx: uniqueIndex('vouchers_code_idx').on(t.code),
  isActiveIdx: index('vouchers_is_active_idx').on(t.isActive),
  expiresAtIdx: index('vouchers_expires_at_idx').on(t.expiresAt),
}));

// ── Types ─────────────────────────────────────────────────────────────────────

export type VoucherRow = typeof vouchersTable.$inferSelect;
export type NewVoucherRow = typeof vouchersTable.$inferInsert;
