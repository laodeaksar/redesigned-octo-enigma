// =============================================================================
// packages/common/errors — barrel export
// Import from: "@repo/common/errors"
// =============================================================================

export type { AppErrorOptions } from "./app-error";
// ── Base ──────────────────────────────────────────────────────────────────────
export {
  AppError,
  InternalError,
} from "./app-error";
// ── Framework Handlers & Helpers ──────────────────────────────────────────────
export {
  elysiaErrorHandler,
  honoErrorHandler,
  normalizeError,
  safeParse,
} from "./handlers";
// ── HTTP Errors ───────────────────────────────────────────────────────────────
export {
  // 400
  BadRequestError,
  // 409
  ConflictError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  // 403
  ForbiddenError,
  InsufficientRoleError,
  // 422
  InsufficientStockError,
  InvalidCredentialsError,
  InvalidVoucherError,
  // 404
  NotFoundError,
  OrderNotFoundError,
  OrderNotPayableError,
  PaymentAlreadyProcessedError,
  PaymentGatewayError,
  PaymentNotFoundError,
  ProductNotFoundError,
  // 429
  RateLimitError,
  // 503
  ServiceUnavailableError,
  SlugAlreadyExistsError,
  TokenExpiredError,
  TokenInvalidError,
  // 401
  UnauthorizedError,
  UserNotFoundError,
  ValidationError as ValidationHttpError,
} from "./http-error";
