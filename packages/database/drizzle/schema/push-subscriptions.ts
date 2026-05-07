import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const pushSubscriptionsTable = pgTable(
  "push_subscriptions",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    userId:      varchar("user_id",      { length: 255 }).notNull(),
    orderId:     varchar("order_id",     { length: 255 }).notNull(),
    orderNumber: varchar("order_number", { length: 100 }),
    endpoint:    text("endpoint").notNull().unique(),
    p256dh:      text("p256dh").notNull(),
    auth:        text("auth").notNull(),
    createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("push_order_idx").on(t.orderId),
    index("push_user_order_idx").on(t.userId, t.orderId),
  ]
);

export type PushSubscriptionRow    = typeof pushSubscriptionsTable.$inferSelect;
export type NewPushSubscriptionRow = typeof pushSubscriptionsTable.$inferInsert;
