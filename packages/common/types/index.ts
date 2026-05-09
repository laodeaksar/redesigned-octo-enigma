// =============================================================================
// packages/common/types — barrel export
// Import from: "@repo/common/types"
// =============================================================================

export type {
  ApiErrorCode,
  ApiErrorResponse,
  // API
  ApiResponse,
  ApiResponseWithMeta,
  ApiResult,
  CursorPaginatedResponse,
  CursorPaginationMeta,
  CursorPaginationParams,
  DateRangeFilter,
  HealthCheckResponse,
  IdParam,
  OffsetPaginationParams,
  PaginatedResponse,
  PaginationMeta,
  ResponseMeta,
  SlugParam,
  SortOrder,
  SortParam,
  ValidationError,
} from "./api";
// packages/common/src/types/index.ts
export * from "./email";
export type {
  OrderCancelledEmailJobData,
  OrderCompletedEmailJobData,
  OrderConfirmationEmailJobData,
  OrderDeliveredEmailJobData,
  OrderExpirySweepJobData,
  OrderPaymentConfirmedJobData,
  OrderShippedEmailJobData,
  PasswordResetEmailJobData,
  // Events
  QueueName,
  StockDeductJobData,
  StockRestoreJobData,
  WelcomeEmailJobData,
} from "./events";
// ── Constants (value exports, not type-only) ──────────────────────────────────
export { QUEUES } from "./events";
export type {
  AppliedDiscount,
  CancellationReason,
  Cart,
  CartItem,
  DiscountType,
  // Order
  Order,
  OrderItem,
  OrderPricing,
  OrderStatus,
  OrderStatusEvent,
  OrderSummary,
  ShippingCourier,
  ShippingInfo,
} from "./order";
export type {
  CStoreInfo,
  EWalletInfo,
  MidtransNotification,
  // Payment
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentSummary,
  Refund,
  RefundReason,
  VirtualAccountInfo,
} from "./payment";
export type {
  Category,
  CategorySummary,
  CategoryTree,
  // Product
  Product,
  ProductDetail,
  ProductImage,
  ProductRatingSummary,
  ProductReview,
  ProductReviewWithAuthor,
  ProductSnapshot,
  ProductStatus,
  ProductSummary,
  ProductVariant,
  ProductVariantSummary,
  StockAdjustment,
  StockAdjustmentReason,
  StockStatus,
} from "./product";
// ── Domain types ──────────────────────────────────────────────────────────────
export type {
  Address,
  AddressSummary,
  JwtPayload,
  OAuthAccount,
  OAuthProvider,
  PublicUser,
  RefreshTokenPayload,
  RequestUser,
  Session,
  // User
  User,
  UserRecord,
  UserRole,
  UserStatus,
  UserSummary,
} from "./user";
