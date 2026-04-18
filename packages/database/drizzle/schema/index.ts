// =============================================================================
// Drizzle schema — barrel export
// Import from: "@my-ecommerce/database/drizzle/schema"
// =============================================================================

// ── Shared helpers & enums ────────────────────────────────────────────────────
export {
  primaryId,
  timestamps,
  softDelete,
  userRoleEnum,
  userStatusEnum,
  oauthProviderEnum,
  productStatusEnum,
  stockAdjustmentReasonEnum,
  paymentStatusEnum,
  paymentMethodEnum,
  discountTypeEnum,
} from "./_helpers";

// ── Auth service tables ───────────────────────────────────────────────────────
export {
  usersTable,
  usersRelations,
} from "./users";
export type { UserRow, NewUserRow } from "./users";

export {
  sessionsTable,
  sessionsRelations,
} from "./sessions";
export type { SessionRow, NewSessionRow } from "./sessions";

export {
  oauthAccountsTable,
  oauthAccountsRelations,
} from "./oauth-accounts";
export type { OAuthAccountRow, NewOAuthAccountRow } from "./oauth-accounts";

export {
  addressesTable,
  addressesRelations,
} from "./addresses";
export type { AddressRow, NewAddressRow } from "./addresses";

// ── Product service tables ────────────────────────────────────────────────────
export {
  categoriesTable,
  categoriesRelations,
} from "./categories";
export type { CategoryRow, NewCategoryRow } from "./categories";

export {
  productsTable,
  productsRelations,
} from "./products";
export type { ProductRow, NewProductRow } from "./products";

export {
  productVariantsTable,
  productVariantsRelations,
} from "./product-variants";
export type { ProductVariantRow, NewProductVariantRow } from "./product-variants";

export {
  productImagesTable,
  productImagesRelations,
} from "./product-images";
export type { ProductImageRow, NewProductImageRow } from "./product-images";

export {
  productReviewsTable,
  productReviewsRelations,
} from "./product-reviews";
export type { ProductReviewRow, NewProductReviewRow } from "./product-reviews";

// ── Payment service tables ────────────────────────────────────────────────────
export {
  paymentsTable,
  paymentsRelations,
} from "./payments";
export type { PaymentRow, NewPaymentRow } from "./payments";

export {
  refundsTable,
  refundsRelations,
} from "./refunds";
export type { RefundRow, NewRefundRow } from "./refunds";

// ── Shared tables ─────────────────────────────────────────────────────────────
export { vouchersTable } from "./vouchers";
export type { VoucherRow, NewVoucherRow } from "./vouchers";
