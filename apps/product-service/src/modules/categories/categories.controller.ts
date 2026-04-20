// =============================================================================
// Categories controller
// =============================================================================

import { success } from "@repo/common/schemas";
import { safeParse } from "@repo/common/errors";
import {
  createCategorySchema,
  updateCategorySchema,
} from "@repo/common/schemas";
import type Redis from "ioredis";

import * as service from "./categories.service";
import type { DB } from "@/config";

export async function handleGetTree(db: DB, redis: Redis | null) {
  return success(await service.getCategoryTree(db, redis));
}

export async function handleList(db: DB, redis: Redis | null) {
  return success(await service.listCategories(db, redis));
}

export async function handleGetById(db: DB, redis: Redis | null, id: string) {
  return success(await service.getCategoryById(db, redis, id));
}

export async function handleCreate(db: DB, redis: Redis | null, body: unknown) {
  const input = safeParse(createCategorySchema, body);
  return success(await service.createCategory(db, redis, input), "Category created");
}

export async function handleUpdate(
  db: DB,
  redis: Redis | null,
  id: string,
  body: unknown
) {
  const input = safeParse(updateCategorySchema, body);
  return success(await service.updateCategory(db, redis, id, input), "Category updated");
}

export async function handleDelete(db: DB, redis: Redis | null, id: string) {
  return success(await service.deleteCategory(db, redis, id));
}

