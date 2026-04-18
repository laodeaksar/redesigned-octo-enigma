// =============================================================================
// HTTP Errors — Semantic error classes mapped to HTTP status codes
// Usage: throw new NotFoundError("Product not found")
// throw new UnauthorizedError()
// throw new ValidationError([{ field: "email", message: "Invalid" }])
// =============================================================================

import { AppError } from "./app-error";
import type { ApiErrorCode } from "../types/api";

type FieldError = { field: string; message: string; code?: string };

// ── 400 Bad Request ───────────────────────────────────────────────────────────

export class BadRequestError extends AppError {
  constructor(
    message = "Bad request",
    code: ApiErrorCode = "INVALID_REQUEST",
    cause?: unknown,
  ) {
    super({ code, statusCode: 400, message, cause });
  }
}

export class ValidationError extends AppError {
  constructor(
    details: FieldError[],
    message = "Validation failed",
    cause?: unknown,
  ) {
    super({
      code: "VALIDATION_ERROR",
      statusCode: 400,
      message,
      details,
      cause,
    });
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = "Invalid email or password", cause?: unknown) {
    super({ code: "INVALID_CREDENTIALS", statusCode: 400, message, cause });
  }
}

// ── 401 Unauthorized ──────────────────────────────────────────────────────────

export class UnauthorizedError extends AppError {
  constructor(
    message = "Authentication required",
    code: ApiErrorCode = "UNAUTHORIZED",
    cause?: unknown,
  ) {
    super({ code, statusCode: 401, message, cause });
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = "Token has expired", cause?: unknown) {
    super({ code: "TOKEN_EXPIRED", statusCode: 401, message, cause });
  }
}

export class TokenInvalidError extends AppError {
  constructor(message = "Token is invalid", cause?: unknown) {
    super({ code: "TOKEN_INVALID", statusCode: 401, message, cause });
  }
}

// ── 403 Forbidden ─────────────────────────────────────────────────────────────

export class ForbiddenError extends AppError {
  constructor(
    message = "Access denied",
    code: ApiErrorCode = "FORBIDDEN",
    cause?: unknown,
  ) {
    super({ code, statusCode: 403, message, cause });
  }
}

export class InsufficientRoleError extends AppError {
  constructor(requiredRole?: string, cause?: unknown) {
    super({
      code: "INSUFFICIENT_ROLE",
      statusCode: 403,
      message: requiredRole
        ? `This action requires the '${requiredRole}' role`
        : "You do not have the required role to perform this action",
      meta: { requiredRole },
      cause,
    });
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor(
    message = "Please verify your email address before continuing",
    cause?: unknown,
  ) {
    super({ code: "EMAIL_NOT_VERIFIED", statusCode: 403, message, cause });
  }
}

// ── 404 Not Found ─────────────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(
    resource = "Resource",
    code: ApiErrorCode = "NOT_FOUND",
    cause?: unknown,
  ) {
    super({
      code,
      statusCode: 404,
      message: `${resource} not found`,
      cause,
    });
  }
}

export class UserNotFoundError extends NotFoundError {
  constructor(cause?: unknown) {
    super("User", "USER_NOT_FOUND", cause);
  }
}

export class ProductNotFoundError extends NotFoundError {
  constructor(cause?: unknown) {
    super("Product", "PRODUCT_NOT_FOUND", cause);
  }
}

export class OrderNotFoundError extends NotFoundError {
  constructor(cause?: unknown) {
    super("Order", "ORDER_NOT_FOUND", cause);
  }
}

export class PaymentNotFoundError extends NotFoundError {
  constructor(cause?: unknown) {
    super("Payment", "PAYMENT_NOT_FOUND", cause);
  }
}

// ── 409 Conflict ──────────────────────────────────────────────────────────────

export class ConflictError extends AppError {
  constructor(
    message = "Resource already exists",
    code: ApiErrorCode = "CONFLICT",
    cause?: unknown,
  ) {
    super({ code, statusCode: 409, message, cause });
  }
}

export class EmailAlreadyExistsError extends ConflictError {
  constructor(email?: string, cause?: unknown) {
    super(
      email
        ? `Email '${email}' is already registered`
        : "Email is already registered",
      "EMAIL_ALREADY_EXISTS",
      cause,
    );
  }
}

export class SlugAlreadyExistsError extends ConflictError {
  constructor(slug?: string, cause?: unknown) {
    super(
      slug ? `Slug '${slug}' is already in use` : "Slug is already in use",
      "SLUG_ALREADY_EXISTS",
      cause,
    );
  }
}

// ── 422 Unprocessable ─────────────────────────────────────────────────────────

export class InsufficientStockError extends AppError {
  constructor(
    variantId: string,
    requested: number,
    available: number,
    cause?: unknown,
  ) {
    super({
      code: "INSUFFICIENT_STOCK",
      statusCode: 422,
      message: `Insufficient stock for variant ${variantId}: requested ${requested}, available ${available}`,
      meta: { variantId, requested, available },
      cause,
    });
  }
}

export class OrderNotPayableError extends AppError {
  constructor(status: string, cause?: unknown) {
    super({
      code: "ORDER_NOT_PAYABLE",
      statusCode: 422,
      message: `Order cannot be paid — current status is '${status}'`,
      meta: { status },
      cause,
    });
  }
}

export class PaymentAlreadyProcessedError extends AppError {
  constructor(cause?: unknown) {
    super({
      code: "PAYMENT_ALREADY_PROCESSED",
      statusCode: 422,
      message: "This payment has already been processed",
      cause,
    });
  }
}

export class InvalidVoucherError extends AppError {
  constructor(
    reason: "not_found" | "expired" | "usage_limit" | "minimum_not_met",
    cause?: unknown,
  ) {
    const messages: Record<typeof reason, string> = {
      not_found: "Voucher code is invalid or does not exist",
      expired: "This voucher has expired",
      usage_limit: "This voucher has reached its usage limit",
      minimum_not_met:
        "Your order does not meet the minimum amount for this voucher",
    };

    const codes: Record<typeof reason, ApiErrorCode> = {
      not_found: "INVALID_VOUCHER",
      expired: "VOUCHER_EXPIRED",
      usage_limit: "VOUCHER_USAGE_LIMIT",
      minimum_not_met: "INVALID_VOUCHER",
    };

    super({
      code: codes[reason],
      statusCode: 422,
      message: messages[reason],
      meta: { reason },
      cause,
    });
  }
}

// ── 429 Too Many Requests ─────────────────────────────────────────────────────

export class RateLimitError extends AppError {
  constructor(
    message = "Too many requests — please slow down",
    cause?: unknown,
  ) {
    super({ code: "RATE_LIMIT_EXCEEDED", statusCode: 429, message, cause });
  }
}

// ── 503 Service Unavailable ───────────────────────────────────────────────────

export class ServiceUnavailableError extends AppError {
  constructor(service?: string, cause?: unknown) {
    super({
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
      message: service
        ? `${service} is currently unavailable`
        : "Service temporarily unavailable",
      meta: service ? { service } : undefined,
      cause,
    });
  }
}

export class PaymentGatewayError extends AppError {
  constructor(message = "Payment gateway error", cause?: unknown) {
    super({
      code: "PAYMENT_GATEWAY_ERROR",
      statusCode: 503,
      message,
      cause,
    });
  }
}
