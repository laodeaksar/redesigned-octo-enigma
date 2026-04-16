// =============================================================================
// AppError — Base error class for the entire monorepo
// All custom errors extend this so instanceof checks work across service layers
// =============================================================================

import type { ApiErrorCode } from "../types/api";

export interface AppErrorOptions {
  /** Machine-readable code sent to clients */
  code: ApiErrorCode;
  /** HTTP status code */
  statusCode: number;
  /** Human-readable message */
  message: string;
  /** Optional field-level validation details */
  details?: Array<{ field: string; message: string; code?: string }>;
  /** Upstream or wrapped error — NOT sent to clients */
  cause?: unknown;
  /** Extra context for server-side logging — NOT sent to clients */
  meta?: Record<string, unknown>;
}

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly details?: Array<{ field: string; message: string; code?: string }>;
  //@ts-ignore
  readonly cause?: unknown;
  readonly meta?: Record<string, unknown>;
  readonly isOperational: boolean;

  constructor(options: AppErrorOptions) {
    super(options.message);

    this.name = this.constructor.name;
    this.code = options.code;
    this.statusCode = options.statusCode;
    //@ts-ignore
    this.details = options.details;
    this.cause = options.cause;
        //@ts-ignore
this.meta = options.meta;

    /**
     * Operational errors are expected runtime failures (user not found,
     * validation failed, etc.) — they should be caught and returned as
     * structured API responses.
     *
     * Non-operational errors (programmer mistakes, unexpected failures)
     * should crash the process or trigger an alert.
     */
    this.isOperational = true;

    // Preserve prototype chain in transpiled environments
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture V8 stack trace without this constructor frame
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /** Serialize to a client-safe JSON object (no internal fields) */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }

  /** Check if an unknown value is an AppError */
  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }

  /** Check if an unknown value is an operational AppError */
  static isOperational(error: unknown): boolean {
    return AppError.isAppError(error) && error.isOperational;
  }
}

// ── Internal / Non-operational Error ─────────────────────────────────────────

/**
 * Represents unexpected programming errors, not operational failures.
 * These should surface as 500 responses and trigger alerts.
 */
export class InternalError extends AppError {
  constructor(message = "An unexpected error occurred", cause?: unknown) {
    super({
      code: "INTERNAL_SERVER_ERROR",
      statusCode: 500,
      message,
      cause,
    });
    //@ts-ignore
    this.isOperational = false as unknown as true; // signal: crash/alert worthy
  }
}
