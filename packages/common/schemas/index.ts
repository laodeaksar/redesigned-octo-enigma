// =============================================================================
// packages/common/schemas — barrel export
// Import from: "@repo/common/schemas"
// =============================================================================

export type {
  ApiErrorCode as ApiErrorCodeSchema,
  GlobalSearchQuery,
  HealthCheckResponse as HealthCheckResponseSchema,
  InternalRequestHeaders,
  ObjectIdParam,
  SlugParam as SlugParamSchema,
  UuidParam,
} from "./api.schema";
// ── API ───────────────────────────────────────────────────────────────────────
export {
  apiErrorCodeSchema,
  bearerTokenSchema,
  failure,
  globalSearchQuerySchema,
  healthCheckResponseSchema,
  internalRequestHeadersSchema,
  objectIdParamSchema,
  paginated,
  slugParamSchema,
  // Response builders (value exports)
  success,
  uuidParamSchema,
} from "./api.schema";
export type { AddressInput } from "./common.schema";
// ── Primitives ─────────────────────────────────────────────────────────────────
export {
  // Shared objects
  addressSchema,
  anyIdSchema,
  commaSeparatedSchema,
  cursorPaginationSchema,
  dateRangeSchema,
  // Dates
  dateSchema,
  // Contact
  emailSchema,
  // Utility transforms
  emptyToNull,
  // Money
  idrAmountSchema,
  imageSchema,
  isoDateStringSchema,
  longStringSchema,
  // Strings
  nonEmptyStringSchema,
  nonNegativeIntSchema,
  objectIdSchema,
  // Pagination
  paginationSchema,
  phoneSchema,
  positiveIdrAmountSchema,
  // Numbers
  positiveIntSchema,
  ratingSchema,
  shortStringSchema,
  slugSchema,
  sortOrderSchema,
  urlSchema,
  // Identifiers
  uuidSchema,
  weightSchema,
} from "./common.schema";
export type {
  CancelOrderInput,
  CartItemInput,
  CreateOrderInput,
  ListOrdersQuery,
  MyOrdersQuery,
  RequestRefundInput,
  ShippingRateQuery,
  UpdateCartItemInput,
  UpdateOrderStatusInput,
  ValidateVoucherInput,
} from "./order.schema";
// ── Order ─────────────────────────────────────────────────────────────────────
export {
  cancellationReasonSchema,
  cancelOrderSchema,
  cartItemSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  myOrdersQuerySchema,
  orderStatusSchema,
  refundReasonSchema,
  requestRefundSchema,
  shippingCourierSchema,
  shippingRateQuerySchema,
  updateCartItemSchema,
  updateOrderStatusSchema,
  validateVoucherSchema,
} from "./order.schema";
export type {
  CreatePaymentInput,
  CreateRefundInput,
  ListPaymentsQuery,
  MidtransNotificationInput,
  PaymentConfirmedCallbackInput,
  RequestRefundInput as RequestPaymentRefundInput,
} from "./payment.schema";
// ── Payment ───────────────────────────────────────────────────────────────────
export {
  createPaymentSchema,
  createRefundSchema,
  listPaymentsQuerySchema,
  midtransNotificationSchema,
  paymentConfirmedCallbackSchema,
  paymentMethodSchema,
  paymentStatusSchema,
  requestRefundSchema as requestPaymentRefundSchema,
} from "./payment.schema";
export type {
  BatchStockDeductInput,
  CreateCategoryInput,
  CreateProductInput,
  CreateReviewInput,
  ListProductsQuery,
  ProductVariantInput,
  SearchProductsQuery,
  StockAdjustmentInput,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateVariantInput,
} from "./product.schema";
// ── Product ───────────────────────────────────────────────────────────────────
export {
  batchStockDeductSchema,
  createCategorySchema,
  createProductSchema,
  createReviewSchema,
  listProductsQuerySchema,
  productStatusSchema,
  productVariantSchema,
  searchProductsQuerySchema,
  stockAdjustmentReasonSchema,
  stockAdjustmentSchema,
  stockStatusSchema,
  updateCategorySchema,
  updateProductSchema,
  updateVariantSchema,
} from "./product.schema";
export type {
  AdminUpdateUserInput,
  ChangePasswordInput,
  CreateAddressInput,
  ForgotPasswordInput,
  ListUsersQuery,
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateAddressInput,
  UpdateProfileInput,
  VerifyEmailInput,
} from "./user.schema";
// ── User ──────────────────────────────────────────────────────────────────────
export {
  adminUpdateUserSchema,
  changePasswordSchema,
  createAddressSchema,
  forgotPasswordSchema,
  listUsersQuerySchema,
  loginSchema,
  oauthProviderSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  updateAddressSchema,
  updateProfileSchema,
  userRoleSchema,
  userStatusSchema,
  verifyEmailSchema,
} from "./user.schema";
