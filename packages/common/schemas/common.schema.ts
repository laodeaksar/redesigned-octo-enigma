// =============================================================================
// Common / Primitive Schemas
// Reusable Zod primitives shared across all domain schemas
// =============================================================================

import { z } from "zod";

// ── Identifiers ───────────────────────────────────────────────────────────────

/** Postgres UUID */
export const uuidSchema = z
  .string()
  .uuid({ message: "Must be a valid UUID" });

/** MongoDB ObjectId as 24-char hex string */
export const objectIdSchema = z
  .string()
  .length(24, { message: "Must be a valid MongoDB ObjectId (24 hex chars)" })
  .regex(/^[a-f\d]{24}$/i, { message: "Must be a valid MongoDB ObjectId" });

/** Accept either UUID or ObjectId depending on context */
export const anyIdSchema = z.union([uuidSchema, objectIdSchema]);

/** URL-safe slug: lowercase, alphanumeric, hyphens only */
export const slugSchema = z
  .string()
  .min(2, { message: "Slug must be at least 2 characters" })
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase, alphanumeric with hyphens only (e.g. my-product)",
  });

// ── Strings ───────────────────────────────────────────────────────────────────

export const nonEmptyStringSchema = z
  .string()
  .min(1, { message: "This field is required" })
  .trim();

export const shortStringSchema = z
  .string()
  .min(1, { message: "This field is required" })
  .max(255)
  .trim();

export const longStringSchema = z
  .string()
  .min(1, { message: "This field is required" })
  .max(10_000)
  .trim();

// ── Contact ───────────────────────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .email({ message: "Must be a valid email address" })
  .toLowerCase()
  .trim();

/** Indonesian phone number — starts with +62 or 08 */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+62|62|0)8[1-9][0-9]{6,11}$/, {
    message: "Must be a valid Indonesian phone number (e.g. 081234567890 or +6281234567890)",
  });

/** URL with http/https */
export const urlSchema = z
  .string()
  .url({ message: "Must be a valid URL" })
  .startsWith("http", { message: "URL must start with http or https" });

// ── Money ─────────────────────────────────────────────────────────────────────

/** IDR amount — positive integer, no decimals */
export const idrAmountSchema = z
  .number()
  .int({ message: "Amount must be a whole number (IDR has no decimal)" })
  .nonnegative({ message: "Amount cannot be negative" });

/** IDR amount — must be > 0 */
export const positiveIdrAmountSchema = idrAmountSchema.positive({
  message: "Amount must be greater than 0",
});

// ── Numbers ───────────────────────────────────────────────────────────────────

export const positiveIntSchema = z
  .number()
  .int()
  .positive({ message: "Must be a positive integer" });

export const nonNegativeIntSchema = z
  .number()
  .int()
  .nonnegative({ message: "Must be zero or a positive integer" });

/** Weight in grams */
export const weightSchema = z
  .number()
  .int()
  .positive({ message: "Weight must be a positive integer (in grams)" })
  .max(100_000, { message: "Weight cannot exceed 100,000g (100kg)" });

/** Rating 1–5 */
export const ratingSchema = z
  .number()
  .int()
  .min(1)
  .max(5) as z.ZodType<1 | 2 | 3 | 4 | 5>;

// ── Dates ─────────────────────────────────────────────────────────────────────

/** Accept ISO 8601 string or Date object, coerce to Date */
export const dateSchema = z.coerce.date();

/** ISO 8601 string representation */
export const isoDateStringSchema = z
  .string()
  .datetime({ message: "Must be a valid ISO 8601 datetime string" });

// ── Pagination ────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");

export const dateRangeSchema = z.object({
  from: isoDateStringSchema.optional(),
  to: isoDateStringSchema.optional(),
}).refine(
  (val) => {
    if (val.from && val.to) {
      return new Date(val.from) <= new Date(val.to);
    }
    return true;
  },
  { message: "'from' date must be before or equal to 'to' date", path: ["from"] }
);

// ── Address ───────────────────────────────────────────────────────────────────

export const addressSchema = z.object({
  label: shortStringSchema.max(50),
  recipientName: shortStringSchema.max(100),
  phone: phoneSchema,
  street: shortStringSchema.max(500),
  city: shortStringSchema.max(100),
  province: shortStringSchema.max(100),
  postalCode: z
    .string()
    .regex(/^\d{5}$/, { message: "Postal code must be exactly 5 digits" }),
  country: z.string().length(2).default("ID").describe("ISO 3166-1 alpha-2"),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;

// ── Image ─────────────────────────────────────────────────────────────────────

export const imageSchema = z.object({
  url: urlSchema,
  altText: z.string().max(255).nullable().default(null),
  sortOrder: nonNegativeIntSchema.default(0),
  isPrimary: z.boolean().default(false),
});

// ── Utility ───────────────────────────────────────────────────────────────────

/** Transform empty string to null (useful for optional fields in forms) */
export const emptyToNull = z
  .string()
  .transform((v) => (v.trim() === "" ? null : v))
  .nullable();

/** Parse comma-separated string into a string array */
export const commaSeparatedSchema = z
  .string()
  .transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
