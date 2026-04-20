// =============================================================================
// Vouchers controller
// =============================================================================

import { success } from "@repo/common/schemas";
import { safeParse } from "@repo/common/errors";
import { validateVoucherSchema } from "@repo/common/schemas";
import * as service from "./vouchers.service";
import type { DB } from "@/config";

export async function handleValidate(db: DB, body: unknown, userId?: string) {
  const { code, orderAmount } = safeParse(validateVoucherSchema, body);
  const result = await service.validateVoucher(db, code, orderAmount, userId);
  return success({
    code: result.voucher.code,
    type: result.voucher.type,
    value: result.voucher.value,
    discountAmount: result.discountAmount,
  });
}

export async function handleList(db: DB) {
  return success(await service.listVouchers(db));
}

export async function handleGetById(db: DB, id: string) {
  return success(await service.getVoucherById(db, id));
}

export async function handleCreate(db: DB, body: unknown) {
  return success(await service.createVoucher(db, body as Parameters<typeof service.createVoucher>[1]), "Voucher created");
}

export async function handleUpdate(db: DB, id: string, body: unknown) {
  return success(await service.updateVoucher(db, id, body as Parameters<typeof service.updateVoucher>[2]), "Voucher updated");
}

