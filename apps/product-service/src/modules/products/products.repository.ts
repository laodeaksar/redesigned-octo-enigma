// =============================================================================
// Products repository
// =============================================================================

import {
  eq,
  and,
  isNull,
  ilike,
  inArray,
  gte,
  lte,
  asc,
  desc,
  sql,
  count,
} from "drizzle-orm";

import {
  productsTable,
  productVariantsTable,
  productImagesTable,
  categoriesTable,
  type ProductRow,
  type NewProductRow,
  type ProductVariantRow,
  type NewProductVariantRow,
  type ProductImageRow,
  type NewProductImageRow,
} from "@repo/database/drizzle/schema";
import type { ListProductsQuery } from "@repo/common/schemas";

import type { DB } from "@/config";

// ── Products ──────────────────────────────────────────────────────────────────

export async function findProductById(
  db: DB,
  id: string
): Promise<ProductRow | undefined> {
  const [row] = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.id, id), isNull(productsTable.deletedAt)))
    .limit(1);
  return row;
}

export async function findProductBySlug(
  db: DB,
  slug: string
): Promise<ProductRow | undefined> {
  const [row] = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.slug, slug), isNull(productsTable.deletedAt)))
    .limit(1);
  return row;
}

export async function findProductWithRelations(db: DB, id: string) {
  const product = await findProductById(db, id);
  if (!product) return undefined;

  const [variants, images, category] = await Promise.all([
    db
      .select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.productId, id))
      .orderBy(asc(productVariantsTable.price)),
    db
      .select()
      .from(productImagesTable)
      .where(eq(productImagesTable.productId, id))
      .orderBy(asc(productImagesTable.sortOrder)),
    db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, product.categoryId))
      .limit(1),
  ]);

  return { ...product, variants, images, category: category[0] ?? null };
}

export async function listProducts(
  db: DB,
  query: ListProductsQuery
): Promise<{ items: ProductRow[]; total: number }> {
  const conditions = [isNull(productsTable.deletedAt)];

  if (query.status) conditions.push(eq(productsTable.status, query.status));
  if (query.categoryId) conditions.push(eq(productsTable.categoryId, query.categoryId));
  if (query.search) conditions.push(ilike(productsTable.name, `%${query.search}%`));

  const sortField =
    query.sortBy === "name" ? productsTable.name :
    query.sortBy === "updatedAt" ? productsTable.updatedAt :
    productsTable.createdAt;

  const orderFn = query.sortOrder === "asc" ? asc : desc;
  const offset = (query.page - 1) * query.limit;

  const [items, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(productsTable)
      .where(and(...conditions))
      .orderBy(orderFn(sortField))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(productsTable)
      .where(and(...conditions)),
  ]);

  return { items, total: Number(total) };
}

export async function createProduct(
  db: DB,
  data: NewProductRow
): Promise<ProductRow> {
  const [row] = await db.insert(productsTable).values(data).returning();
  return row!;
}

export async function updateProduct(
  db: DB,
  id: string,
  data: Partial<NewProductRow>
): Promise<ProductRow | undefined> {
  const [row] = await db
    .update(productsTable)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(productsTable.id, id), isNull(productsTable.deletedAt)))
    .returning();
  return row;
}

export async function softDeleteProduct(db: DB, id: string): Promise<boolean> {
  const result = await db
    .update(productsTable)
    .set({ deletedAt: new Date(), status: "archived" })
    .where(eq(productsTable.id, id))
    .returning({ id: productsTable.id });
  return result.length > 0;
}

// ── Variants ──────────────────────────────────────────────────────────────────

export async function findVariantById(
  db: DB,
  id: string
): Promise<ProductVariantRow | undefined> {
  const [row] = await db
    .select()
    .from(productVariantsTable)
    .where(eq(productVariantsTable.id, id))
    .limit(1);
  return row;
}

export async function findVariantsBySku(
  db: DB,
  skus: string[]
): Promise<ProductVariantRow[]> {
  if (skus.length === 0) return [];
  return db
    .select()
    .from(productVariantsTable)
    .where(inArray(productVariantsTable.sku, skus));
}

export async function createVariant(
  db: DB,
  data: NewProductVariantRow
): Promise<ProductVariantRow> {
  const [row] = await db.insert(productVariantsTable).values(data).returning();
  return row!;
}

export async function updateVariant(
  db: DB,
  id: string,
  data: Partial<NewProductVariantRow>
): Promise<ProductVariantRow | undefined> {
  const [row] = await db
    .update(productVariantsTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(productVariantsTable.id, id))
    .returning();
  return row;
}

export async function deleteVariant(db: DB, id: string): Promise<boolean> {
  const result = await db
    .delete(productVariantsTable)
    .where(eq(productVariantsTable.id, id))
    .returning({ id: productVariantsTable.id });
  return result.length > 0;
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export async function adjustStock(
  db: DB,
  variantId: string,
  delta: number
): Promise<ProductVariantRow | undefined> {
  const [row] = await db
    .update(productVariantsTable)
    .set({
      stock: sql`GREATEST(0, ${productVariantsTable.stock} + ${delta})`,
      updatedAt: new Date(),
    })
    .where(eq(productVariantsTable.id, variantId))
    .returning();
  return row;
}

/** Check if all requested quantities are available before deducting */
export async function checkStockAvailability(
  db: DB,
  items: Array<{ variantId: string; quantity: number }>
): Promise<Array<{ variantId: string; available: number; requested: number }>> {
  const ids = items.map((i) => i.variantId);
  const variants = await db
    .select({ id: productVariantsTable.id, stock: productVariantsTable.stock })
    .from(productVariantsTable)
    .where(inArray(productVariantsTable.id, ids));

  const stockMap = new Map(variants.map((v) => [v.id, v.stock]));

  return items.map((item) => ({
    variantId: item.variantId,
    available: stockMap.get(item.variantId) ?? 0,
    requested: item.quantity,
  }));
}

// ── Images ────────────────────────────────────────────────────────────────────

export async function createImage(
  db: DB,
  data: NewProductImageRow
): Promise<ProductImageRow> {
  const [row] = await db.insert(productImagesTable).values(data).returning();
  return row!;
}

export async function deleteImage(db: DB, id: string): Promise<ProductImageRow | undefined> {
  const [row] = await db
    .delete(productImagesTable)
    .where(eq(productImagesTable.id, id))
    .returning();
  return row;
}

export async function setPrimaryImage(
  db: DB,
  productId: string,
  imageId: string
): Promise<void> {
  await db
    .update(productImagesTable)
    .set({ isPrimary: false })
    .where(eq(productImagesTable.productId, productId));

  await db
    .update(productImagesTable)
    .set({ isPrimary: true })
    .where(eq(productImagesTable.id, imageId));
}

