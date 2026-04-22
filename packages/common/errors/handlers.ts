// =============================================================================
// Error Handlers — Framework-specific middleware
// Converts AppError / ZodError / unknown into structured API responses
// =============================================================================

import { ZodError } from "zod";
import type { ZodSchema, ZodTypeAny, z } from "zod";

import { AppError, InternalError } from "./app-error";
import { ValidationError } from "./http-error";

// ── Normalise any thrown value → AppError ─────────────────────────────────────

/**
 * Converts any thrown value into a well-formed AppError.
 *
 *  - AppError   → returned as-is
 *  - ZodError   → wrapped in ValidationError (400), original preserved as cause
 *  - Error      → wrapped in InternalError (500), original preserved as cause
 *  - anything   → wrapped in InternalError (500)
 */
export function normalizeError(error: unknown): AppError {
  if (AppError.isAppError(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    const details = error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
      code: e.code,
    }));
    // Pass original ZodError as cause for better debugging
    return new ValidationError(details, "Validation failed", error);
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
 *   import { elysiaErrorHandler } from "@repo/common/errors"
 *
 *   const app = new Elysia()
 *     .onError(elysiaErrorHandler)
 */
export function elysiaErrorHandler({
  error,
  set,
}: {
  error: unknown;
  set: { status: number };
}) {
  const appError = normalizeError(error);

  // Log non-operational errors (programmer mistakes / unexpected failures)
  if (!appError.isOperational) {
    console.error("[UNHANDLED ERROR]", {
      name: appError.name,
      message: appError.message,
      stack: appError.stack,
      cause: appError.cause,
      meta: appError.meta,
    });
    // TODO: kirim ke Sentry/Datadog di sini
  }

  set.status = appError.statusCode;
  return appError.toJSON();
}

// ── Hono error handler ────────────────────────────────────────────────────────

/**
 * Drop-in error handler for Hono apps.
 *
 * Usage:
 *   import { honoErrorHandler } from "@repo/common/errors"
 *   import { Hono } from "hono"
 *
 *   const app = new Hono()
 *   app.onError(honoErrorHandler)
 */
export function honoErrorHandler(
  error: unknown,
  c: { json: (body: unknown, status: number) => Response },
): Response {
  const appError = normalizeError(error);

  if (!appError.isOperational) {
    console.error("[UNHANDLED ERROR]", {
      name: appError.name,
      message: appError.message,
      stack: appError.stack,
      cause: appError.cause,
      meta: appError.meta,
    });
    // TODO: kirim ke Sentry/Datadog di sini
  }

  return c.json(appError.toJSON(), appError.statusCode as any);
}

// ── Safe Zod parse helper ─────────────────────────────────────────────────────

/**
 * Parse unknown data with a Zod schema.
 * Throws a ValidationError (400) on failure instead of a raw ZodError.
 * Original ZodError is preserved as cause.
 *
 * Usage:
 *   const body = safeParse(bodySchema, await c.req.json())
 */
export function safeParse<T extends ZodTypeAny>(
  schema: T,
  data: unknown,
): z.infer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const details = result.error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
      code: e.code,
    }));
    // Pass ZodError as cause biar stack trace lengkap
    throw new ValidationError(details, "Validation failed", result.error);
  }

  return result.data;
}

// ── Type guard helpers ────────────────────────────────────────────────────────

export { AppError, InternalError } from "./app-error";
export * from "./http-error";
