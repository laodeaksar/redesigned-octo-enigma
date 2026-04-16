// =============================================================================
// HTTP Errors — Semantic error classes mapped to HTTP status codes
// Usage: throw new NotFoundError("Product not found")
//        throw new UnauthorizedError()
//        throw new ValidationError([{ field: "email", message: "Invalid" }])
// =============================================================================

import { AppError } from "./app-error";
import type { ApiErrorCode } from "../types/api";

type FieldError = { field: string; message: string; code?: string };

// ── 400 Bad Request ───────────────────────────────────────────────────────────

export class BadRequestError extends AppError {
  constructor(
    message = "Bad request",
    code: ApiErrorCode = "INVALID_REQUEST",
    cause?: unknown
  ) {
    super({ code, statusCode: 400, message, cause });
  }
}

export class ValidationError extends AppError {
  constructor(details: FieldError[], message = "Validation failed") {
    super({
      code: "VALIDATION_ERROR",
      statusCode: 400,
      message,
      details,
    });
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = "Invalid email or password") {
    super({ code: "INVALID_CREDENTIALS", statusCode: 400, message });
  }
}

// ── 401 Unauthorized ──────────────────────────────────────────────────────────

export class UnauthorizedError extends AppError {
  constructor(
    message = "Authentication required",
    code: ApiErrorCode = "UNAUTHORIZED"
  ) {
    super({ code, statusCode: 401, message });
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = "Token has expired") {
    super({ code: "TOKEN_EXPIRED", statusCode: 401, message });
  }
}

export class TokenInvalidError extends AppError {
  constructor(message = "Token is invalid") {
    super({ code: "TOKEN_INVALID", statusCode: 401, message });
  }
}

// ── 403 Forbidden ─────────────────────────────────────────────────────────────

export class ForbiddenError extends AppError {
  constructor(
    message = "Access denied",
    code: ApiErrorCode = "FORBIDDEN"
  ) {
    super({ code, statusCode: 403, message });
  }
}

export class InsufficientRoleError extends AppError {
  constructor(requiredRole?: string) {
    super({
      code: "INSUFFICIENT_ROLE",
      statusCode: 403,
      message: requiredRole
        ? `This action requires the '${requiredRole}' role`
        : "You do not have the required role to perform this action",
    });
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor(message = "Please verify your email address before continuing") {
    super({ code: "EMAIL_NOT_VERIFIED", statusCode: 403, message });
  }
}

// ── 404 Not Found ─────────────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(
    resource = "Resource",
    code: ApiErrorCode = "NOT_FOUND"
  ) {
    super({
      code,
      statusCode: 404,
      message: `${resource} not found`,
    });
  }
}

export class UserNotFoundError extends NotFoundError {
  constructor() {
    super("User", "USER_NOT_FOUND");
  }
}

export class ProductNotFoundError extends NotFoundError {
  constructor() {
    super("Product", "PRODUCT_NOT_FOUND");
  }
}

export class OrderNotFoundError extends NotFoundError {
  constructor() {
    super("Order", "ORDER_NOT_FOUND");
  }
}

export class PaymentNotFoundError extends NotFoundError {
  constructor() {
    super("Payment", "PAYMENT_NOT_FOUND");
  }
}

// ── 409 Conflict ──────────────────────────────────────────────────────────────

export class ConflictError extends AppError {
  constructor(
    message = "Resource already exists",
    code: ApiErrorCode = "CONFLICT"
  ) {
    super({ code, statusCode: 409, message });
  }
}

export class EmailAlreadyExistsError extends ConflictError {
  constructor(email?: string) {
    super(
      email ? `Email '${email}' is already registered` : "Email is already registered",
      "EMAIL_ALREADY_EXISTS"
    );
  }
}

export class SlugAlreadyExistsError extends ConflictError {
  constructor(slug?: string) {
    super(
      slug ? `Slug '${slug}' is already in use` : "Slug is already in use",
      "SLUG_ALREADY_EXISTS"
    );
  }
}

// ── 422 Unprocessable ─────────────────────────────────────────────────────────

export class InsufficientStockError extends AppError {
  constructor(
    variantId: string,
    requested: number,
    available: number
  ) {
    super({
      code: "INSUFFICIENT_STOCK",
      statusCode: 422,
      message: `Insufficient stock for variant ${variantId}: requested ${requested}, available ${available}`,
      meta: { variantId, requested, available },
    });
  }
}

export class OrderNotPayableError extends AppError {
  constructor(status: string) {
    super({
      code: "ORDER_NOT_PAYABLE",
      statusCode: 422,
      message: `Order cannot be paid — current status is '${status}'`,
      meta: { status },
    });
  }
}

export class PaymentAlreadyProcessedError extends AppError {
  constructor() {
    super({
      code: "PAYMENT_ALREADY_PROCESSED",
      statusCode: 422,
      message: "This payment has already been processed",
    });
  }
}

export class InvalidVoucherError extends AppError {
  constructor(
    reason: "not_found" | "expired" | "usage_limit" | "minimum_not_met"
  ) {
    const messages: Record<typeof reason, string> = {
      not_found: "Voucher code is invalid or does not exist",
      expired: "This voucher has expired",
      usage_limit: "This voucher has reached its usage limit",
      minimum_not_met: "Your order does not meet the minimum amount for this voucher",
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
    });
  }
}

// ── 429 Too Many Requests ─────────────────────────────────────────────────────

export class RateLimitError extends AppError {
  constructor(message = "Too many requests — please slow down") {
    super({ code: "RATE_LIMIT_EXCEEDED", statusCode: 429, message });
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
