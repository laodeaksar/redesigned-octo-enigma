// =============================================================================
// API Types — Response wrappers, pagination, errors
// Used by: all services and frontend apps
// =============================================================================

// ── Success Response ──────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiResponseWithMeta<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
  message?: string;
}

// ── Error Response ────────────────────────────────────────────────────────────

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    /** Field-level validation errors */
    details?: ValidationError[];
    /** Unique request ID for tracing */
    requestId?: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

// ── Error Codes ───────────────────────────────────────────────────────────────

export type ApiErrorCode =
  // 400
  | "VALIDATION_ERROR"
  | "INVALID_REQUEST"
  | "INVALID_CREDENTIALS"
  // 401
  | "UNAUTHORIZED"
  | "TOKEN_EXPIRED"
  | "TOKEN_INVALID"
  // 403
  | "FORBIDDEN"
  | "INSUFFICIENT_ROLE"
  | "EMAIL_NOT_VERIFIED"
  // 404
  | "NOT_FOUND"
  | "USER_NOT_FOUND"
  | "PRODUCT_NOT_FOUND"
  | "ORDER_NOT_FOUND"
  | "PAYMENT_NOT_FOUND"
  // 409
  | "CONFLICT"
  | "EMAIL_ALREADY_EXISTS"
  | "SLUG_ALREADY_EXISTS"
  // 422
  | "INSUFFICIENT_STOCK"
  | "ORDER_NOT_PAYABLE"
  | "PAYMENT_ALREADY_PROCESSED"
  | "INVALID_VOUCHER"
  | "VOUCHER_EXPIRED"
  | "VOUCHER_USAGE_LIMIT"
  // 429
  | "RATE_LIMIT_EXCEEDED"
  // 500
  | "INTERNAL_SERVER_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "PAYMENT_GATEWAY_ERROR";

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// ── Pagination ────────────────────────────────────────────────────────────────

/** Standard cursor-based pagination params */
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

/** Standard offset-based pagination params */
export interface OffsetPaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CursorPaginationMeta {
  nextCursor: string | null;
  prevCursor: string | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

export type ResponseMeta = PaginationMeta | CursorPaginationMeta;

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface CursorPaginatedResponse<T> {
  items: T[];
  meta: CursorPaginationMeta;
}

// ── Sort & Filter ─────────────────────────────────────────────────────────────

export type SortOrder = "asc" | "desc";

export interface SortParam<T extends string = string> {
  field: T;
  order: SortOrder;
}

export interface DateRangeFilter {
  from?: Date;
  to?: Date;
}

// ── Misc ──────────────────────────────────────────────────────────────────────

/** Generic ID param */
export interface IdParam {
  id: string;
}

/** Generic slug param */
export interface SlugParam {
  slug: string;
}

/** Health check response */
export interface HealthCheckResponse {
  status: "ok" | "degraded" | "down";
  service: string;
  version: string;
  uptime: number;
  timestamp: Date;
  checks: Record<string, "ok" | "error">;
}
