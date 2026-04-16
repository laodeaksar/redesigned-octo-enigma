// =============================================================================
// packages/common/schemas — barrel export
// Import from: "@repo/common/schemas"
// =============================================================================

// ── Primitives ─────────────────────────────────────────────────────────────────
export {
  // Identifiers
  uuidSchema,
  objectIdSchema,
  anyIdSchema,
  slugSchema,
  // Strings
  nonEmptyStringSchema,
  shortStringSchema,
  longStringSchema,
  // Contact
  emailSchema,
  phoneSchema,
  urlSchema,
  // Money
  idrAmountSchema,
  positiveIdrAmountSchema,
  // Numbers
  positiveIntSchema,
  nonNegativeIntSchema,
  weightSchema,
  ratingSchema,
  // Dates
  dateSchema,
  isoDateStringSchema,
  // Pagination
  paginationSchema,
  cursorPaginationSchema,
  sortOrderSchema,
  dateRangeSchema,
  // Shared objects
  addressSchema,
  imageSchema,
  // Utility transforms
  emptyToNull,
  commaSeparatedSchema,
} from "./common.schema";

export type { AddressInput } from "./common.schema";

// ── User ──────────────────────────────────────────────────────────────────────
export {
  userRoleSchema,
  userStatusSchema,
  oauthProviderSchema,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  adminUpdateUserSchema,
  verifyEmailSchema,
  createAddressSchema,
  updateAddressSchema,
  listUsersQuerySchema,
} from "./user.schema";

export type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  UpdateProfileInput,
  AdminUpdateUserInput,
  VerifyEmailInput,
  CreateAddressInput,
  UpdateAddressInput,
  ListUsersQuery,
} from "./user.schema";

// ── Product ───────────────────────────────────────────────────────────────────
export {
  productStatusSchema,
  stockStatusSchema,
  stockAdjustmentReasonSchema,
  createCategorySchema,
  updateCategorySchema,
  productVariantSchema,
  updateVariantSchema,
  createProductSchema,
  updateProductSchema,
  stockAdjustmentSchema,
  batchStockDeductSchema,
  createReviewSchema,
  listProductsQuerySchema,
  searchProductsQuerySchema,
} from "./product.schema";

export type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ProductVariantInput,
  UpdateVariantInput,
  CreateProductInput,
  UpdateProductInput,
  StockAdjustmentInput,
  BatchStockDeductInput,
  CreateReviewInput,
  ListProductsQuery,
  SearchProductsQuery,
} from "./product.schema";

// ── Order ─────────────────────────────────────────────────────────────────────
export {
  orderStatusSchema,
  cancellationReasonSchema,
  shippingCourierSchema,
  cartItemSchema,
  updateCartItemSchema,
  shippingRateQuerySchema,
  createOrderSchema,
  cancelOrderSchema,
  updateOrderStatusSchema,
  refundReasonSchema,
  requestRefundSchema,
  validateVoucherSchema,
  listOrdersQuerySchema,
  myOrdersQuerySchema,
} from "./order.schema";

export type {
  CartItemInput,
  UpdateCartItemInput,
  ShippingRateQuery,
  CreateOrderInput,
  CancelOrderInput,
  UpdateOrderStatusInput,
  RequestRefundInput,
  ValidateVoucherInput,
  ListOrdersQuery,
  MyOrdersQuery,
} from "./order.schema";

// ── Payment ───────────────────────────────────────────────────────────────────
export {
  paymentStatusSchema,
  paymentMethodSchema,
  createPaymentSchema,
  midtransNotificationSchema,
  createRefundSchema,
  requestRefundSchema as requestPaymentRefundSchema,
  listPaymentsQuerySchema,
  paymentConfirmedCallbackSchema,
} from "./payment.schema";

export type {
  CreatePaymentInput,
  MidtransNotificationInput,
  CreateRefundInput,
  RequestRefundInput as RequestPaymentRefundInput,
  ListPaymentsQuery,
  PaymentConfirmedCallbackInput,
} from "./payment.schema";

// ── API ───────────────────────────────────────────────────────────────────────
export {
  uuidParamSchema,
  objectIdParamSchema,
  slugParamSchema,
  internalRequestHeadersSchema,
  bearerTokenSchema,
  apiErrorCodeSchema,
  globalSearchQuerySchema,
  healthCheckResponseSchema,
  // Response builders (value exports)
  success,
  paginated,
  failure,
} from "./api.schema";

export type {
  UuidParam,
  ObjectIdParam,
  SlugParam as SlugParamSchema,
  InternalRequestHeaders,
  ApiErrorCode as ApiErrorCodeSchema,
  GlobalSearchQuery,
  HealthCheckResponse as HealthCheckResponseSchema,
} from "./api.schema";
