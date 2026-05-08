// =============================================================================
// Drizzle schema — barrel export
// Import from: "@repo/database/drizzle/schema"
// =============================================================================

// ── Shared helpers & enums ────────────────────────────────────────────────────
export {
  discountTypeEnum,
  oauthProviderEnum,
  paymentMethodEnum,
  paymentStatusEnum,
  primaryId,
  productStatusEnum,
  softDelete,
  stockAdjustmentReasonEnum,
  timestamps,
  userRoleEnum,
  userStatusEnum,
} from "./_helpers";
export type { AccountRow, NewAccountRow } from "./accounts";
export {
  accountsRelations,
  accountsTable,
} from "./accounts";
export type { AddressRow, NewAddressRow } from "./addresses";
export {
  addressesRelations,
  addressesTable,
} from "./addresses";
export type { AuditLogRow, NewAuditLogRow } from "./audit-logs";
// ── Security audit log ────────────────────────────────────────────────────────
export { auditLogsTable } from "./audit-logs";
export type { CategoryRow, NewCategoryRow } from "./categories";
// ── Product service tables ────────────────────────────────────────────────────
export {
  categoriesRelations,
  categoriesTable,
} from "./categories";
export type { NewOAuthAccountRow, OAuthAccountRow } from "./oauth-accounts";
export {
  oauthAccountsRelations,
  oauthAccountsTable,
} from "./oauth-accounts";
export type { NewPaymentRow, PaymentRow } from "./payments";
// ── Payment service tables ────────────────────────────────────────────────────
export {
  paymentsRelations,
  paymentsTable,
} from "./payments";
export type { NewProductImageRow, ProductImageRow } from "./product-images";
export {
  productImagesRelations,
  productImagesTable,
} from "./product-images";
export type { NewProductReviewRow, ProductReviewRow } from "./product-reviews";
export {
  productReviewsRelations,
  productReviewsTable,
} from "./product-reviews";
export type {
  NewProductVariantRow,
  ProductVariantRow,
} from "./product-variants";
export {
  productVariantsRelations,
  productVariantsTable,
} from "./product-variants";
export type { NewProductRow, ProductRow } from "./products";
export {
  productsRelations,
  productsTable,
} from "./products";
export type {
  NewPushSubscriptionRow,
  PushSubscriptionRow,
} from "./push-subscriptions";
// ── Push notifications ────────────────────────────────────────────────────────
export { pushSubscriptionsTable } from "./push-subscriptions";
export type { NewRefundRow, RefundRow } from "./refunds";
export {
  refundsRelations,
  refundsTable,
} from "./refunds";
export type { NewSessionRow, SessionRow } from "./sessions";
export {
  sessionsRelations,
  sessionsTable,
} from "./sessions";
export type { NewUserRow, UserRow } from "./users";
// ── Auth service tables ───────────────────────────────────────────────────────
export {
  usersRelations,
  usersTable,
} from "./users";
export type { NewVerificationRow, VerificationRow } from "./verifications";
export { verificationsTable } from "./verifications";
export type { NewVoucherRow, VoucherRow } from "./vouchers";
// ── Shared tables ─────────────────────────────────────────────────────────────
export { vouchersTable } from "./vouchers";
export type { NewWebhookEventRow, WebhookEventRow } from "./webhook-events";
// ── Webhook event log ─────────────────────────────────────────────────────────
export { webhookEventsTable } from "./webhook-events";
export type { NewWishlist, Wishlist } from "./wishlist";
export { wishlistsTable } from "./wishlist";
