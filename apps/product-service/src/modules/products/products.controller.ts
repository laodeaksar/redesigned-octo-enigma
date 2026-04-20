// =============================================================================
// Products controller
// =============================================================================

import { success, paginated } from "@repo/common/schemas";
import { safeParse } from "@repo/common/errors";
import {
  listProductsQuerySchema,
  createProductSchema,
  updateProductSchema,
  productVariantSchema,
  updateVariantSchema,
  stockAdjustmentSchema,
  batchStockDeductSchema,
} from "@repo/common/schemas";
import type Redis from "ioredis";

import * as service from "./products.service";
import type { DB } from "@/config";

export async function handleList(db: DB, redis: Redis | null, query: unknown) {
  const parsed = safeParse(listProductsQuerySchema, query);
  const { items, total } = await service.listProducts(db, redis, parsed);
  return paginated(items, { total, page: parsed.page, limit: parsed.limit });
}

export async function handleGetById(db: DB, redis: Redis | null, id: string) {
  return success(await service.getProductById(db, redis, id));
}

export async function handleGetBySlug(db: DB, redis: Redis | null, slug: string) {
  return success(await service.getProductBySlug(db, redis, slug));
}

export async function handleCreate(db: DB, redis: Redis | null, body: unknown) {
  const input = safeParse(createProductSchema, body);
  return success(await service.createProduct(db, redis, input), "Product created");
}

export async function handleUpdate(
  db: DB, redis: Redis | null, id: string, body: unknown
) {
  const input = safeParse(updateProductSchema, body);
  return success(await service.updateProduct(db, redis, id, input), "Product updated");
}

export async function handleDelete(db: DB, redis: Redis | null, id: string) {
  return success(await service.deleteProduct(db, redis, id));
}

// ── Variants ──────────────────────────────────────────────────────────────────

export async function handleAddVariant(
  db: DB, redis: Redis | null, productId: string, body: unknown
) {
  const input = safeParse(productVariantSchema, body);
  return success(await service.addVariant(db, redis, productId, input), "Variant added");
}

export async function handleUpdateVariant(
  db: DB, redis: Redis | null, productId: string, variantId: string, body: unknown
) {
  const input = safeParse(updateVariantSchema, body);
  return success(await service.updateVariant(db, redis, productId, variantId, input));
}

export async function handleDeleteVariant(
  db: DB, redis: Redis | null, productId: string, variantId: string
) {
  return success(await service.deleteVariant(db, redis, productId, variantId));
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export async function handleAdjustStock(
  db: DB, redis: Redis | null, body: unknown
) {
  const input = safeParse(stockAdjustmentSchema, body);
  return success(await service.adjustStock(db, redis, input));
}

export async function handleBatchDeduct(
  db: DB, redis: Redis | null, body: unknown
) {
  const input = safeParse(batchStockDeductSchema, body);
  return success(await service.batchDeductStock(db, redis, input));
}

// ── Images ────────────────────────────────────────────────────────────────────

export async function handleAddImage(
  db: DB, redis: Redis | null, productId: string, body: unknown
) {
  return success(
    await service.addImage(db, redis, productId, body as {
      url: string; altText?: string | null; isPrimary?: boolean
    }),
    "Image added"
  );
}

export async function handleRemoveImage(
  db: DB, redis: Redis | null, productId: string, imageId: string
) {
  return success(await service.removeImage(db, redis, productId, imageId));
}

