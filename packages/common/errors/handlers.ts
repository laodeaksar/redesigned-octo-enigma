// =============================================================================
// Error Handlers — Framework-specific middleware
// Converts AppError / ZodError / unknown into structured API responses
// =============================================================================

import { ZodError, type ZodType, type infer as ZodInfer } from "zod";

import { AppError, InternalError } from "./app-error";
import { ValidationError, type ErrorDetail } from "./http-error";

// ── Normalise any thrown value → AppError ─────────────────────────────────────

/**
 * Converts any thrown value into a well-formed AppError.
 *
 *  - AppError   → returned as-is
 *  - ZodError   → wrapped in ValidationError (400)
 *  - Error      → wrapped in InternalError (500), original preserved as cause
 *  - anything   → wrapped in InternalError (500)
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof ZodError) {
    //@ts-ignore
    const details = error.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
      code: e.code,
    }))
    return new ValidationError(details)
  }

  if (error instanceof Error) {
    return new InternalError(error.message, error)
  }

  return new InternalError("An unexpected error occurred", error)
}
export function normalizeError(error: unknown): AppError {
  if (AppError.isAppError(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    const details: ErrorDetail[] = error.issues.map((issue) => ({
      field: issue.path.join(".") || "root",
      message: issue.message,
      code: issue.code, // ZodIssueCode di v4
    }));
    return new ValidationError("Validation failed", details);
  }

  if (error instanceof Error) {
    return new InternalError(error.message, error);
  }

  return new InternalError("An unexpected error occurred", error);
}


// ── Elysia error handler ──────────────────────────────────────────────────────

/**
 * Drop-in error handler for Elysia.js apps.
 *
 * Usage:
 *   import { elysiaErrorHandler } from "@my-ecommerce/common/errors"
 *
 *   const app = new Elysia()
 *     .onError(elysiaErrorHandler)
 */
export function elysiaErrorHandler({
  error,
  set,
}: {
  error: unknown
  set: { status: number }
}) {
  const appError = normalizeError(error)

  // Log non-operational errors (programmer mistakes / unexpected failures)
  if (!appError.isOperational) {
    console.error("[UNHANDLED ERROR]", {
      name: appError.name,
      message: appError.message,
      stack: appError.stack,
      cause: appError.cause,
      meta: appError.meta,
    })
  }

  set.status = appError.statusCode
  return appError.toJSON()
}

// ── Hono error handler ────────────────────────────────────────────────────────

/**
 * Drop-in error handler for Hono apps.
 *
 * Usage:
 *   import { honoErrorHandler } from "@my-ecommerce/common/errors"
 *   import { Hono } from "hono"
 *
 *   const app = new Hono()
 *   app.onError(honoErrorHandler)
 */

export function honoErrorHandler(error: unknown, c: Context): Response {
  const appError = normalizeError(error)
  logUnexpectedError(appError)

  // appError.statusCode diketik sebagai number, Hono menerima StatusCode (200-599)
  return c.json(appError.toJSON(), appError.statusCode as any)
}

// ── Safe Zod parse helper ─────────────────────────────────────────────────────

/**
 * Parse unknown data with a Zod schema.
 * Throws a ValidationError (400) on failure instead of a raw ZodError.
 *
 * Usage:
 *   const body = safeParse(bodySchema, await c.req.json())
 */

export function safeParse<T extends ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = schema.safeParse(data)

  if (!result.success) {
    throw new ValidationError(mapZodErrorToDetails(result.error))
  }

  return result.data
}

// ── Type guard helpers ────────────────────────────────────────────────────────

export { AppError } from "./app-error"


// ── Elysia error handler ──────────────────────────────────────────────────────

/**
 * Drop-in error handler for Elysia.js apps.
 *
 * Usage:
 *   import { elysiaErrorHandler } from "@my-ecommerce/common/errors"
 *
 *   const app = new Elysia()
 *     .onError(elysiaErrorHandler)
 */
export function elysiaErrorHandler({
  error,
  set,
  request, // Elysia >=1.1 kasih ini
  log,
}: {
  error: unknown;
  set: { status: number };
  request?: Request;
  log?: { error: (...args: unknown[]) => void };
}) {
  const appError = normalizeError(error);

  // Log non-operational errors (programmer mistakes / unexpected failures)
  if (!appError.isOperational) {
    const logFn = log?.error ?? console.error;
    logFn("[UNHANDLED ERROR]", {
      name: appError.name,
      message: appError.message,
      stack: appError.stack,
      cause: appError.cause,
      meta: appError.meta,
      url: request?.url,
    });
  }

  set.status = appError.statusCode;
  return appError.toJSON();
}

// ── Hono error handler ────────────────────────────────────────────────────────

/**
 * Drop-in error handler for Hono apps.
 *
 * Usage:
 *   import { honoErrorHandler } from "@my-ecommerce/common/errors"
 *   import { Hono } from "hono"
 *
 *   const app = new Hono()
 *   app.onError(honoErrorHandler)
 */
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function honoErrorHandler(error: unknown, c: Context): Response {
  const appError = normalizeError(error);

  if (!appError.isOperational) {
    console.error("[UNHANDLED ERROR]", {
      name: appError.name,
      message: appError.message,
      stack: appError.stack,
      cause: appError.cause,
      meta: appError.meta,
      path: c.req.path,
      method: c.req.method,
    });
  }

  return c.json(
    appError.toJSON(),
    appError.statusCode as ContentfulStatusCode
  );
}

// ── Safe Zod parse helper ─────────────────────────────────────────────────────

/**
 * Parse unknown data with a Zod schema.
 * Throws a ValidationError (400) on failure instead of a raw ZodError.
 *
 * Usage:
 *   const body = safeParse(bodySchema, await c.req.json())
 */
export function safeParse<T extends ZodType>(
  schema: T,
  data: unknown
): ZodInfer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const details: ErrorDetail[] = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "root",
      message: issue.message,
      code: issue.code,
    }));
    throw new ValidationError("Validation failed", details);
  }

  return result.data;
}

// ── Type guard helpers ────────────────────────────────────────────────────────

export { AppError } from "./app-error";