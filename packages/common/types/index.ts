// =============================================================================
// packages/common/types — barrel export
// Import from: "@repo/common/types"
// =============================================================================

// ── Domain types ──────────────────────────────────────────────────────────────
export type {
    // User
    User,
    UserRecord,
    PublicUser,
    UserSummary,
    UserRole,
    UserStatus,
    OAuthProvider,
    OAuthAccount,
    JwtPayload,
    RefreshTokenPayload,
    Session,
    RequestUser,
    Address,
    AddressSummary,
  } from "./user";
  
  export type {
    // Product
    Product,
    ProductDetail,
    ProductSummary,
    ProductSnapshot,
    ProductStatus,
    StockStatus,
    ProductVariant,
    ProductVariantSummary,
    ProductImage,
    Category,
    CategorySummary,
    CategoryTree,
    StockAdjustment,
    StockAdjustmentReason,
    ProductReview,
    ProductReviewWithAuthor,
    ProductRatingSummary,
  } from "./product";
  
  export type {
    // Order
    Order,
    OrderSummary,
    OrderStatus,
    OrderItem,
    OrderPricing,
    ShippingInfo,
    ShippingCourier,
    AppliedDiscount,
    DiscountType,
    OrderStatusEvent,
    CancellationReason,
    CartItem,
    Cart,
  } from "./order";
  
  export type {
    // Payment
    Payment,
    PaymentSummary,
    PaymentStatus,
    PaymentMethod,
    VirtualAccountInfo,
    EWalletInfo,
    CStoreInfo,
    MidtransNotification,
    Refund,
    RefundReason,
  } from "./payment";
  
  export type {
    // API
    ApiResponse,
    ApiResponseWithMeta,
    ApiErrorResponse,
    ApiResult,
    ApiErrorCode,
    ValidationError,
    CursorPaginationParams,
    OffsetPaginationParams,
    PaginationMeta,
    CursorPaginationMeta,
    ResponseMeta,
    PaginatedResponse,
    CursorPaginatedResponse,
    SortOrder,
    SortParam,
    DateRangeFilter,
    IdParam,
    SlugParam,
    HealthCheckResponse,
  } from "./api";
  
  export type {
    // Events
    BaseEvent,
    ServiceName,
    EventType,
    AppEvent,
    QueueName,
    // Individual event types
    UserRegisteredEvent,
    UserRegisteredPayload,
    UserEmailVerifiedEvent,
    UserEmailVerifiedPayload,
    UserPasswordResetRequestedEvent,
    UserPasswordResetRequestedPayload,
    ProductStockLowEvent,
    ProductStockLowPayload,
    ProductOutOfStockEvent,
    ProductOutOfStockPayload,
    OrderCreatedEvent,
    OrderCreatedPayload,
    OrderPaidEvent,
    OrderPaidPayload,
    OrderShippedEvent,
    OrderShippedPayload,
    OrderCancelledEvent,
    OrderCancelledPayload,
    PaymentSucceededEvent,
    PaymentSucceededPayload,
    PaymentExpiredEvent,
    PaymentExpiredPayload,
  } from "./events";
  
  // ── Constants (value exports, not type-only) ──────────────────────────────────
  export { QUEUES } from "./events";
  