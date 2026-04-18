// =============================================================================
// Categories seed
// Creates a two-level category tree
// =============================================================================

import { eq } from "drizzle-orm";

import type { DrizzleClient } from "../drizzle/client";
import { categoriesTable } from "../drizzle/schema";

const ROOT_CATEGORIES = [
  {
    name: "Fashion",
    slug: "fashion",
    description: "Pakaian, sepatu, dan aksesori",
  },
  {
    name: "Elektronik",
    slug: "elektronik",
    description: "Gadget, komputer, dan perangkat elektronik",
  },
  {
    name: "Rumah & Dapur",
    slug: "rumah-dapur",
    description: "Perabot, dekorasi, dan perlengkapan dapur",
  },
  {
    name: "Olahraga",
    slug: "olahraga",
    description: "Peralatan olahraga dan perlengkapan gym",
  },
  {
    name: "Kecantikan",
    slug: "kecantikan",
    description: "Skincare, makeup, dan perawatan tubuh",
  },
];

// Sub-categories: parentSlug → list of children
const SUB_CATEGORIES: Record<
  string,
  Array<{ name: string; slug: string; description?: string }>
> = {
  fashion: [
    { name: "Pakaian Pria", slug: "pakaian-pria" },
    { name: "Pakaian Wanita", slug: "pakaian-wanita" },
    { name: "Sepatu Pria", slug: "sepatu-pria" },
    { name: "Sepatu Wanita", slug: "sepatu-wanita" },
    { name: "Tas", slug: "tas" },
    { name: "Aksesori", slug: "aksesori-fashion" },
  ],
  elektronik: [
    { name: "Smartphone", slug: "smartphone" },
    { name: "Laptop", slug: "laptop" },
    { name: "Tablet", slug: "tablet" },
    { name: "Audio & Headphone", slug: "audio-headphone" },
    { name: "Kamera", slug: "kamera" },
    { name: "Aksesori Elektronik", slug: "aksesori-elektronik" },
  ],
  "rumah-dapur": [
    { name: "Furnitur", slug: "furnitur" },
    { name: "Dekorasi Rumah", slug: "dekorasi-rumah" },
    { name: "Peralatan Dapur", slug: "peralatan-dapur" },
    { name: "Perlengkapan Mandi", slug: "perlengkapan-mandi" },
  ],
  olahraga: [
    { name: "Sepatu Olahraga", slug: "sepatu-olahraga" },
    { name: "Pakaian Olahraga", slug: "pakaian-olahraga" },
    { name: "Peralatan Gym", slug: "peralatan-gym" },
    { name: "Outdoor & Camping", slug: "outdoor-camping" },
  ],
  kecantikan: [
    { name: "Skincare", slug: "skincare" },
    { name: "Makeup", slug: "makeup" },
    { name: "Perawatan Rambut", slug: "perawatan-rambut" },
    { name: "Parfum", slug: "parfum" },
  ],
};

export async function seedCategories(db: DrizzleClient): Promise<void> {
  console.info("🌱 Seeding categories…");

  // ── Root categories ────────────────────────────────────────────────────────
  const insertedRoots = await db
    .insert(categoriesTable)
    .values(ROOT_CATEGORIES)
    .onConflictDoNothing({ target: categoriesTable.slug })
    .returning({ id: categoriesTable.id, slug: categoriesTable.slug });

  // Fetch all roots (including pre-existing ones)
  const allRoots = await db
    .select({ id: categoriesTable.id, slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(eq(categoriesTable.parentId, null as unknown as string));

  console.info(`   ✓ ${insertedRoots.length} root categories inserted`);

  // ── Sub-categories ─────────────────────────────────────────────────────────
  const slugToId = Object.fromEntries(allRoots.map((r) => [r.slug, r.id]));
  let subCount = 0;

  for (const [parentSlug, children] of Object.entries(SUB_CATEGORIES)) {
    const parentId = slugToId[parentSlug];
    if (!parentId) continue;

    const inserted = await db
      .insert(categoriesTable)
      .values(children.map((c) => ({ ...c, parentId })))
      .onConflictDoNothing({ target: categoriesTable.slug })
      .returning({ id: categoriesTable.id });

    subCount += inserted.length;
  }

  console.info(`   ✓ ${subCount} sub-categories inserted`);
}
