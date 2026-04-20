// =============================================================================
// Categories service
// =============================================================================

import type Redis from "ioredis";

import {
  NotFoundError,
  ConflictError,
} from "@repo/common/errors";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@repo/common/schemas";

import * as repo from "./categories.repository";
import {
  CacheKey,
  cacheWrap,
  invalidateCategories,
} from "@/lib/cache";
import type { DB } from "@/config";

export async function getCategoryTree(db: DB, redis: Redis | null) {
  return cacheWrap(
    redis,
    CacheKey.categoryTree(),
    async () => {
      const all = await repo.findAllCategories(db);
      return repo.buildCategoryTree(all);
    },
    600 // 10 minutes
  );
}

export async function listCategories(db: DB, redis: Redis | null) {
  return cacheWrap(
    redis,
    CacheKey.categoryList(),
    () => repo.findAllCategories(db),
    600
  );
}

export async function getCategoryById(
  db: DB,
  redis: Redis | null,
  id: string
) {
  return cacheWrap(redis, CacheKey.category(id), async () => {
    const cat = await repo.findCategoryById(db, id);
    if (!cat || cat.deletedAt) throw new NotFoundError("Category");
    return cat;
  });
}

export async function createCategory(
  db: DB,
  redis: Redis | null,
  input: CreateCategoryInput
) {
  const existing = await repo.findCategoryBySlug(db, input.slug);
  if (existing) throw new ConflictError(`Slug '${input.slug}' is already in use`, "SLUG_ALREADY_EXISTS");

  if (input.parentId) {
    const parent = await repo.findCategoryById(db, input.parentId);
    if (!parent || parent.deletedAt) throw new NotFoundError("Parent category");
  }

  const category = await repo.createCategory(db, input);
  await invalidateCategories(redis);
  return category;
}

export async function updateCategory(
  db: DB,
  redis: Redis | null,
  id: string,
  input: UpdateCategoryInput
) {
  const existing = await repo.findCategoryById(db, id);
  if (!existing || existing.deletedAt) throw new NotFoundError("Category");

  if (input.slug && input.slug !== existing.slug) {
    const slugConflict = await repo.findCategoryBySlug(db, input.slug);
    if (slugConflict) throw new ConflictError(`Slug '${input.slug}' is already in use`, "SLUG_ALREADY_EXISTS");
  }

  const updated = await repo.updateCategory(db, id, input);
  await invalidateCategories(redis);
  return updated!;
}

export async function deleteCategory(
  db: DB,
  redis: Redis | null,
  id: string
) {
  const existing = await repo.findCategoryById(db, id);
  if (!existing || existing.deletedAt) throw new NotFoundError("Category");

  await repo.softDeleteCategory(db, id);
  await invalidateCategories(redis);
  return { message: "Category deleted successfully" };
}

