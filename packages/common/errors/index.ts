// =============================================================================
// packages/common/errors — barrel export
// Import from: "@my-ecommerce/common/errors"
// =============================================================================

// ── Base ──────────────────────────────────────────────────────────────────────
export {
  AppError,
  InternalError,
} from "./app-error";

export type { AppErrorOptions } from "./app-error";

// ── HTTP Errors ───────────────────────────────────────────────────────────────
export {
  // 400
  BadRequestError,
  ValidationError as ValidationHttpError,
  InvalidCredentialsError,
  // 401
  UnauthorizedError,
  TokenExpiredError,
  TokenInvalidError,
  // 403
  ForbiddenError,
  InsufficientRoleError,
  EmailNotVerifiedError,
  // 404
  NotFoundError,
  UserNotFoundError,
  ProductNotFoundError,
  OrderNotFoundError,
  PaymentNotFoundError,
  // 409
  ConflictError,
  EmailAlreadyExistsError,
  SlugAlreadyExistsError,
  // 422
  InsufficientStockError,
  OrderNotPayableError,
  PaymentAlreadyProcessedError,
  InvalidVoucherError,
  // 429
  RateLimitError,
  // 503
  ServiceUnavailableError,
  PaymentGatewayError,
} from "./http-error";

// ── Framework Handlers & Helpers ──────────────────────────────────────────────
export {
  normalizeError,
  elysiaErrorHandler,
  honoErrorHandler,
  safeParse,
} from "./handlers";
