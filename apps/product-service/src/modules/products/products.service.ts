// =============================================================================
// Products service
// =============================================================================

import type Redis from "ioredis";

import {
  NotFoundError,
  ConflictError,
  InsufficientStockError,
} from "@repo/common/errors";
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductVariantInput,
  UpdateVariantInput,
  StockAdjustmentInput,
  BatchStockDeductInput,
  ListProductsQuery,
} from "@repo/common/schemas";

import * as repo from "./products.repository";
import {
  CacheKey,
  cacheWrap,
  invalidateProduct,
} from "@/lib/cache";
import { deleteImage as deleteS3Image, extractKeyFromUrl } from "@/lib/storage";
import { getPublisher } from "@/config";
import type { DB } from "@/config";

// ── Products ──────────────────────────────────────────────────────────────────

export async function searchProducts(
  db: DB,
  redis: Redis | null,
  input: { query: string; page: number; limit: number; categoryId?: string }
) {
  const cacheKey = CacheKey.productList(
    `search:${input.query}:${input.page}:${input.limit}:${input.categoryId ?? ""}`
  );
  return cacheWrap(
    redis,
    cacheKey,
    () => repo.fullTextSearch(db, input.query, input.page, input.limit, input.categoryId),
    60 // 1 min TTL for search results
  );
}

export async function listProducts(
  db: DB,
  redis: Redis | null,
  query: ListProductsQuery
) {
  const cacheKey = CacheKey.productList(JSON.stringify(query));
  return cacheWrap(redis, cacheKey, () => repo.listProducts(db, query), 60);
}

export async function getProductById(db: DB, redis: Redis | null, id: string) {
  return cacheWrap(redis, CacheKey.product(id), async () => {
    const product = await repo.findProductWithRelations(db, id);
    if (!product) throw new NotFoundError("Product");
    return product;
  });
}

export async function getProductBySlug(db: DB, redis: Redis | null, slug: string) {
  return cacheWrap(redis, CacheKey.productBySlug(slug), async () => {
    const row = await repo.findProductBySlug(db, slug);
    if (!row) throw new NotFoundError("Product");
    const product = await repo.findProductWithRelations(db, row.id);
    if (!product) throw new NotFoundError("Product");
    return product;
  });
}

export async function createProduct(
  db: DB,
  redis: Redis | null,
  input: CreateProductInput
) {
  // Check slug uniqueness
  const existing = await repo.findProductBySlug(db, input.slug);
  if (existing) throw new ConflictError(`Slug '${input.slug}' is already in use`, "SLUG_ALREADY_EXISTS");

  // Check SKU uniqueness across all variants
  const skus = input.variants.map((v) => v.sku);
  const existingVariants = await repo.findVariantsBySku(db, skus);
  if (existingVariants.length > 0) {
    throw new ConflictError(
      `SKU(s) already in use: ${existingVariants.map((v) => v.sku).join(", ")}`,
      "CONFLICT"
    );
  }

  // Insert product
  const { variants, images, ...productData } = input;
  const product = await repo.createProduct(db, productData);

  // Insert variants
  for (const variant of variants) {
    await repo.createVariant(db, { ...variant, productId: product.id });
  }

  // Insert images
  for (let i = 0; i < images.length; i++) {
    const img = images[i]!;
    await repo.createImage(db, {
      ...img,
      productId: product.id,
      sortOrder: i,
      isPrimary: i === 0,
    });
  }

  await invalidateProduct(redis, product.id);
  return repo.findProductWithRelations(db, product.id);
}

export async function updateProduct(
  db: DB,
  redis: Redis | null,
  id: string,
  input: UpdateProductInput
) {
  const existing = await repo.findProductById(db, id);
  if (!existing) throw new NotFoundError("Product");

  if (input.slug && input.slug !== existing.slug) {
    const conflict = await repo.findProductBySlug(db, input.slug);
    if (conflict) throw new ConflictError(`Slug '${input.slug}' is already in use`, "SLUG_ALREADY_EXISTS");
  }

  await repo.updateProduct(db, id, input);
  await invalidateProduct(redis, id, existing.slug);
  return repo.findProductWithRelations(db, id);
}

export async function deleteProduct(
  db: DB,
  redis: Redis | null,
  id: string
) {
  const existing = await repo.findProductById(db, id);
  if (!existing) throw new NotFoundError("Product");

  await repo.softDeleteProduct(db, id);
  await invalidateProduct(redis, id, existing.slug);
  return { message: "Product deleted successfully" };
}

// ── Variants ──────────────────────────────────────────────────────────────────

export async function addVariant(
  db: DB,
  redis: Redis | null,
  productId: string,
  input: ProductVariantInput
) {
  const product = await repo.findProductById(db, productId);
  if (!product) throw new NotFoundError("Product");

  const [existing] = await repo.findVariantsBySku(db, [input.sku]);
  if (existing) throw new ConflictError(`SKU '${input.sku}' is already in use`, "CONFLICT");

  const variant = await repo.createVariant(db, { ...input, productId });
  await invalidateProduct(redis, productId, product.slug);
  return variant;
}

export async function updateVariant(
  db: DB,
  redis: Redis | null,
  productId: string,
  variantId: string,
  input: UpdateVariantInput
) {
  const variant = await repo.findVariantById(db, variantId);
  if (!variant || variant.productId !== productId) throw new NotFoundError("Variant");

  const updated = await repo.updateVariant(db, variantId, input);
  const product = await repo.findProductById(db, productId);
  await invalidateProduct(redis, productId, product?.slug);
  return updated!;
}

export async function deleteVariant(
  db: DB,
  redis: Redis | null,
  productId: string,
  variantId: string
) {
  const variant = await repo.findVariantById(db, variantId);
  if (!variant || variant.productId !== productId) throw new NotFoundError("Variant");

  await repo.deleteVariant(db, variantId);
  const product = await repo.findProductById(db, productId);
  await invalidateProduct(redis, productId, product?.slug);
  return { message: "Variant deleted successfully" };
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export async function adjustStock(
  db: DB,
  redis: Redis | null,
  input: StockAdjustmentInput
) {
  const variant = await repo.findVariantById(db, input.variantId);
  if (!variant) throw new NotFoundError("Variant");

  const updated = await repo.adjustStock(db, input.variantId, input.delta);
  await invalidateProduct(redis, variant.productId);

  // Publish stock events if stock drops low or out
  if (updated && input.delta < 0) {
    const publisher = getPublisher();
    if (updated.stock === 0) {
      await publisher.emit("product.out_of_stock", {
        productId: variant.productId,
        variantId: variant.id,
        sku: variant.sku,
      });
    } else if (updated.stock <= 5) {
      await publisher.emit("product.stock_low", {
        productId: variant.productId,
        variantId: variant.id,
        sku: variant.sku,
        currentStock: updated.stock,
        threshold: 5,
      });
    }
  }

  return updated!;
}

/** Called internally by order-service — deduct multiple variants atomically */
export async function batchDeductStock(
  db: DB,
  redis: Redis | null,
  input: BatchStockDeductInput
) {
  // 1. Check availability first
  const availability = await repo.checkStockAvailability(db, input.items);
  const insufficient = availability.filter((a) => a.available < a.requested);

  if (insufficient.length > 0) {
    const first = insufficient[0]!;
    throw new InsufficientStockError(
      first.variantId,
      first.requested,
      first.available
    );
  }

  // 2. Deduct each variant
  const results = await Promise.all(
    input.items.map((item) =>
      repo.adjustStock(db, item.variantId, -item.quantity)
    )
  );

  // 3. Invalidate cache for affected products
  const affectedProductIds = new Set(
    (await Promise.all(
      input.items.map((item) => repo.findVariantById(db, item.variantId))
    ))
      .filter(Boolean)
      .map((v) => v!.productId)
  );

  for (const productId of affectedProductIds) {
    await invalidateProduct(redis, productId);
  }

  return results;
}

// ── Images ────────────────────────────────────────────────────────────────────

export async function addImage(
  db: DB,
  redis: Redis | null,
  productId: string,
  data: { url: string; altText?: string | null; isPrimary?: boolean }
) {
  const product = await repo.findProductById(db, productId);
  if (!product) throw new NotFoundError("Product");

  if (data.isPrimary) {
    await repo.setPrimaryImage(db, productId, ""); // unset all first
  }

  const image = await repo.createImage(db, {
    productId,
    url: data.url,
    altText: data.altText ?? null,
    isPrimary: data.isPrimary ?? false,
    sortOrder: 0,
  });

  await invalidateProduct(redis, productId, product.slug);
  return image;
}

export async function removeImage(
  db: DB,
  redis: Redis | null,
  productId: string,
  imageId: string
) {
  const product = await repo.findProductById(db, productId);
  if (!product) throw new NotFoundError("Product");

  const deleted = await repo.deleteImage(db, imageId);
  if (!deleted) throw new NotFoundError("Image");

  // Delete from S3 if key is embedded in URL
  const key = extractKeyFromUrl(deleted.url);
  if (key) await deleteS3Image(key);

  await invalidateProduct(redis, productId, product.slug);
  return { message: "Image deleted successfully" };
}

