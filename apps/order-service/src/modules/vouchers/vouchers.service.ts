// =============================================================================
// Vouchers service
// =============================================================================

import { NotFoundError, InvalidVoucherError, ConflictError } from "@repo/common/errors";
import type { VoucherRow } from "@repo/database/drizzle/schema";
import * as repo from "./vouchers.repository";
import type { DB } from "@/config";

// ── Validation ────────────────────────────────────────────────────────────────

export interface VoucherValidationResult {
  voucher: VoucherRow;
  discountAmount: number;
}

export async function validateVoucher(
  db: DB,
  code: string,
  orderSubtotal: number,
  userId?: string
): Promise<VoucherValidationResult> {
  const voucher = await repo.findVoucherByCode(db, code);

  if (!voucher || !voucher.isActive) {
    throw new InvalidVoucherError("not_found");
  }

  const now = new Date();

  if (voucher.startsAt && now < voucher.startsAt) {
    throw new InvalidVoucherError("not_found"); // not yet active
  }

  if (voucher.expiresAt && now > voucher.expiresAt) {
    throw new InvalidVoucherError("expired");
  }

  if (
    voucher.usageLimit !== null &&
    voucher.usageCount >= voucher.usageLimit
  ) {
    throw new InvalidVoucherError("usage_limit");
  }

  if (
    voucher.restrictedToUserId !== null &&
    userId &&
    voucher.restrictedToUserId !== userId
  ) {
    throw new InvalidVoucherError("not_found");
  }

  if (orderSubtotal < voucher.minimumOrderAmount) {
    throw new InvalidVoucherError("minimum_not_met");
  }

  const discountAmount = calculateDiscount(voucher, orderSubtotal);

  return { voucher, discountAmount };
}

/**
 * Calculate the actual IDR discount amount for a given subtotal.
 */
export function calculateDiscount(
  voucher: VoucherRow,
  subtotal: number
): number {
  switch (voucher.type) {
    case "percentage": {
      const raw = Math.floor((subtotal * voucher.value) / 100);
      return voucher.maximumDiscountAmount !== null
        ? Math.min(raw, voucher.maximumDiscountAmount)
        : raw;
    }
    case "fixed_amount":
      return Math.min(voucher.value, subtotal);
    case "free_shipping":
      return 0; // handled separately in order pricing
    default:
      return 0;
  }
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

export async function listVouchers(db: DB) {
  return repo.listVouchers(db);
}

export async function getVoucherById(db: DB, id: string) {
  const voucher = await repo.findVoucherById(db, id);
  if (!voucher) throw new NotFoundError("Voucher");
  return voucher;
}

export async function createVoucher(db: DB, data: Parameters<typeof repo.createVoucher>[1]) {
  const existing = await repo.findVoucherByCode(db, data.code!);
  if (existing) throw new ConflictError(`Voucher code '${data.code}' already exists`, "CONFLICT");
  return repo.createVoucher(db, data);
}

export async function updateVoucher(
  db: DB,
  id: string,
  data: Parameters<typeof repo.updateVoucher>[2]
) {
  const voucher = await repo.findVoucherById(db, id);
  if (!voucher) throw new NotFoundError("Voucher");
  return repo.updateVoucher(db, id, data);
}

