// =============================================================================
// form-validators — project-level utilities for TanStack Form v1 + Zod
//
// TanStack Form v1 does NOT have `validationLogic` or `revalidateLogic` as
// native APIs. This module provides equivalent project-local helpers so forms
// can use a consistent, declarative pattern:
//
//   const revalidate = revalidateLogic()
//   const form = useForm({
//     defaultValues: { ... },
//     validators: { onDynamic: zodValidator(mySchema) },
//   })
//
// Notes:
//   - `onDynamic` IS a real TanStack Form v1 API (form-level and field-level).
//     At the form level it fires on every state change and populates
//     `form.state.errors`. At the field level it fires dynamically.
//   - `zodValidator(schema)` wraps a Zod schema into the function signature
//     TanStack Form expects, so you can pass schemas directly.
//   - `zodFieldError(schema, field, values)` extracts per-field errors from a
//     full-schema parse — ideal for schemas with cross-field `.refine()` rules.
//   - `revalidateLogic(mode?)` returns a config object that controls WHEN
//     `FieldError` components render their messages. Pass it alongside `useForm`
//     and thread it into each field's `<FieldError show={...} />` prop.
// =============================================================================

import type { ZodType } from "zod";

// ── Revalidate config ─────────────────────────────────────────────────────────

export type RevalidateMode =
  | "onTouched"   // show errors only after the user has interacted with a field
  | "always";     // show errors immediately (useful for server-populated forms)

export interface RevalidateConfig {
  mode: RevalidateMode;
  /** Returns true when the field's error message should be rendered. */
  shouldShow(isTouched: boolean, submissionAttempts?: number): boolean;
}

/**
 * Returns a validation display config.
 * Default mode is `"onTouched"` — errors surface only after the user
 * touches a field OR the form has had at least one submission attempt.
 */
export function revalidateLogic(
  mode: RevalidateMode = "onTouched",
): RevalidateConfig {
  return {
    mode,
    shouldShow: (isTouched, submissionAttempts = 0) =>
      mode === "always" || isTouched || submissionAttempts > 0,
  };
}

// ── Zod → TanStack Form validators ───────────────────────────────────────────

/**
 * Wraps a Zod schema into a validator function for TanStack Form's
 * `validators.onDynamic` (form-level) or per-field validator slots.
 *
 * Usage:
 *   validators: { onDynamic: zodValidator(mySchema) }
 */
export function zodValidator<T>(
  schema: ZodType<T>,
): (ctx: { value: T }) => string | undefined {
  return ({ value }) => {
    const result = schema.safeParse(value);
    if (result.success) return undefined;
    return result.error.issues[0]?.message ?? "Validation error";
  };
}

/**
 * Validates the full schema against `allValues` and returns the error message
 * for a specific `fieldName`. Returns `undefined` when that field is valid.
 *
 * Designed for schemas with cross-field `.refine()` rules (e.g. passwords
 * match, new password ≠ current password) where individual field shapes are
 * not directly accessible.
 *
 * Usage (inside a field validator):
 *   onChange: ({ fieldApi }) =>
 *     zodFieldError(schema, "confirmPassword", fieldApi.form.state.values)
 */
export function zodFieldError<T extends Record<string, unknown>>(
  schema: ZodType<T>,
  fieldName: keyof T & string,
  allValues: T,
): string | undefined {
  const result = schema.safeParse(allValues);
  if (result.success) return undefined;
  const issue = result.error.issues.find((i) => i.path[0] === fieldName);
  return issue?.message;
}
