// =============================================================================
// Categories repository
// =============================================================================

import type { CategoryTree } from "@repo/common/types";

import {
  type CategoryRow,
  categoriesTable,
  type NewCategoryRow,
} from "@repo/database/drizzle/schema";
import { asc, eq, isNull } from "drizzle-orm";

import type { DB } from "@/config";

export async function findAllCategories(db: DB): Promise<CategoryRow[]> {
  return db
    .select()
    .from(categoriesTable)
    .where(isNull(categoriesTable.deletedAt))
    .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.name));
}

export async function findRootCategories(db: DB): Promise<CategoryRow[]> {
  return db
    .select()
    .from(categoriesTable)
    .where(isNull(categoriesTable.parentId))
    .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.name));
}

export async function findCategoryById(
  db: DB,
  id: string
): Promise<CategoryRow | undefined> {
  const [row] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .limit(1);
  return row;
}

export async function findCategoryBySlug(
  db: DB,
  slug: string
): Promise<CategoryRow | undefined> {
  const [row] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, slug))
    .limit(1);
  return row;
}

export async function createCategory(
  db: DB,
  data: NewCategoryRow
): Promise<CategoryRow> {
  const [row] = await db.insert(categoriesTable).values(data).returning();
  return row!;
}

export async function updateCategory(
  db: DB,
  id: string,
  data: Partial<NewCategoryRow>
): Promise<CategoryRow | undefined> {
  const [row] = await db
    .update(categoriesTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(categoriesTable.id, id))
    .returning();
  return row;
}

export async function softDeleteCategory(db: DB, id: string): Promise<boolean> {
  const result = await db
    .update(categoriesTable)
    .set({ deletedAt: new Date() })
    .where(eq(categoriesTable.id, id))
    .returning({ id: categoriesTable.id });
  return result.length > 0;
}

// ── Tree builder ──────────────────────────────────────────────────────────────

export function buildCategoryTree(rows: CategoryRow[]): CategoryTree[] {
  const map = new Map<string, CategoryTree>();

  for (const row of rows) {
    map.set(row.id, { ...row, children: [] });
  }

  const roots: CategoryTree[] = [];

  for (const node of map.values()) {
    if (node.parentId) {
      const parent = map.get(node.parentId);
      parent?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
