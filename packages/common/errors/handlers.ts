// =============================================================================
// Error Handlers — Framework-specific middleware
// Converts AppError / ZodError / unknown into structured API responses
// =============================================================================

import { ZodError } from "zod";

import { AppError, InternalError } from "./app-error";
import { ValidationError } from "./http-error";

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
    return error;
  }

  if (error instanceof ZodError) {
    const details = error.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
      code: e.code,
    }));
    return new ValidationError(details);
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
export function honoErrorHandler(
  error: unknown,
  c: { json: (body: unknown, status: number) => Response }
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
  }

  return c.json(appError.toJSON(), appError.statusCode as Parameters<typeof c.json>[1]);
}

// ── Safe Zod parse helper ─────────────────────────────────────────────────────

import type { ZodSchema, ZodTypeAny, z } from "zod";

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
  const result = schema.safeParse(data);

  if (!result.success) {
    const details = result.error.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
      code: e.code,
    }));
    throw new ValidationError(details);
  }

  return result.data;
}

// ── Type guard helpers ────────────────────────────────────────────────────────

export { AppError } from "./app-error";
