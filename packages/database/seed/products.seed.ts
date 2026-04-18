// =============================================================================
// Products seed
// Creates sample products with variants and images per category
// =============================================================================

import { eq } from "drizzle-orm";

import type { DrizzleClient } from "../drizzle/client";
import {
  categoriesTable,
  productsTable,
  productVariantsTable,
  productImagesTable,
} from "../drizzle/schema";

// ── Placeholder image generator ───────────────────────────────────────────────
const img = (w: number, h: number, text: string) =>
  `https://placehold.co/${w}x${h}/1a1a2e/ffffff?text=${encodeURIComponent(text)}`;

// ── Product definitions ────────────────────────────────────────────────────────

type ProductSeed = {
  categorySlug: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  tags: string[];
  status: "active" | "draft";
  variants: Array<{
    sku: string;
    name: string;
    attributes: Record<string, string>;
    price: number;
    compareAtPrice?: number;
    stock: number;
    weight: number;
  }>;
  images: Array<{ url: string; altText: string; isPrimary: boolean }>;
};

const PRODUCTS: ProductSeed[] = [
  // ── Smartphone ─────────────────────────────────────────────────────────────
  {
    categorySlug: "smartphone",
    name: "TechPro X15 Smartphone",
    slug: "techpro-x15-smartphone",
    description:
      "Smartphone flagship dengan layar AMOLED 6.7 inci, kamera 200MP, dan baterai 5000mAh. " +
      "Dilengkapi dengan chipset terbaru dan dukungan 5G untuk performa maksimal.",
    shortDescription: "Flagship 5G, kamera 200MP, baterai 5000mAh",
    tags: ["smartphone", "5g", "flagship", "android"],
    status: "active",
    variants: [
      {
        sku: "TECH-X15-8-256",
        name: "8GB / 256GB - Hitam",
        attributes: { ram: "8GB", storage: "256GB", color: "Hitam" },
        price: 5_999_000,
        compareAtPrice: 6_999_000,
        stock: 50,
        weight: 195,
      },
      {
        sku: "TECH-X15-12-256",
        name: "12GB / 256GB - Putih",
        attributes: { ram: "12GB", storage: "256GB", color: "Putih" },
        price: 7_499_000,
        compareAtPrice: 8_499_000,
        stock: 30,
        weight: 195,
      },
      {
        sku: "TECH-X15-12-512",
        name: "12GB / 512GB - Biru",
        attributes: { ram: "12GB", storage: "512GB", color: "Biru" },
        price: 8_999_000,
        stock: 20,
        weight: 195,
      },
    ],
    images: [
      { url: img(800, 800, "TechPro X15"), altText: "TechPro X15 tampak depan", isPrimary: true },
      { url: img(800, 800, "X15 Kamera"), altText: "TechPro X15 modul kamera", isPrimary: false },
      { url: img(800, 800, "X15 Samping"), altText: "TechPro X15 tampak samping", isPrimary: false },
    ],
  },

  // ── Laptop ─────────────────────────────────────────────────────────────────
  {
    categorySlug: "laptop",
    name: "UltraBook Pro 14",
    slug: "ultrabook-pro-14",
    description:
      "Laptop ultrabook premium dengan layar IPS 14 inci 2K, prosesor Intel Core i7 generasi terbaru, " +
      "dan desain tipis 15mm. Baterai tahan 12 jam untuk produktivitas sepanjang hari.",
    shortDescription: "Ultrabook tipis 15mm, layar 2K, baterai 12 jam",
    tags: ["laptop", "ultrabook", "intel", "produktivitas"],
    status: "active",
    variants: [
      {
        sku: "UBP14-i5-16-512",
        name: "Intel i5 / 16GB / 512GB SSD - Space Gray",
        attributes: { processor: "Intel Core i5", ram: "16GB", storage: "512GB SSD", color: "Space Gray" },
        price: 12_999_000,
        compareAtPrice: 14_999_000,
        stock: 15,
        weight: 1350,
      },
      {
        sku: "UBP14-i7-16-512",
        name: "Intel i7 / 16GB / 512GB SSD - Silver",
        attributes: { processor: "Intel Core i7", ram: "16GB", storage: "512GB SSD", color: "Silver" },
        price: 16_999_000,
        stock: 10,
        weight: 1350,
      },
      {
        sku: "UBP14-i7-32-1T",
        name: "Intel i7 / 32GB / 1TB SSD - Black",
        attributes: { processor: "Intel Core i7", ram: "32GB", storage: "1TB SSD", color: "Black" },
        price: 21_999_000,
        stock: 5,
        weight: 1350,
      },
    ],
    images: [
      { url: img(800, 600, "UltraBook Pro 14"), altText: "UltraBook Pro 14 tampak atas", isPrimary: true },
      { url: img(800, 600, "Layar 2K"), altText: "Layar 2K IPS", isPrimary: false },
    ],
  },

  // ── Pakaian Pria ───────────────────────────────────────────────────────────
  {
    categorySlug: "pakaian-pria",
    name: "Kaos Polos Premium Cotton",
    slug: "kaos-polos-premium-cotton",
    description:
      "Kaos polos berbahan 100% cotton combed 30s yang lembut dan nyaman dipakai sehari-hari. " +
      "Tersedia dalam berbagai warna pilihan dengan jahitan yang rapi dan tahan lama.",
    shortDescription: "100% cotton combed 30s, tersedia 6 warna",
    tags: ["kaos", "fashion-pria", "casual", "cotton"],
    status: "active",
    variants: [
      { sku: "KAOS-PRIA-S-HTM", name: "S - Hitam", attributes: { size: "S", color: "Hitam" }, price: 89_000, stock: 100, weight: 180 },
      { sku: "KAOS-PRIA-M-HTM", name: "M - Hitam", attributes: { size: "M", color: "Hitam" }, price: 89_000, stock: 150, weight: 200 },
      { sku: "KAOS-PRIA-L-HTM", name: "L - Hitam", attributes: { size: "L", color: "Hitam" }, price: 89_000, stock: 120, weight: 220 },
      { sku: "KAOS-PRIA-XL-HTM", name: "XL - Hitam", attributes: { size: "XL", color: "Hitam" }, price: 89_000, stock: 80, weight: 240 },
      { sku: "KAOS-PRIA-S-PTH", name: "S - Putih", attributes: { size: "S", color: "Putih" }, price: 89_000, stock: 100, weight: 180 },
      { sku: "KAOS-PRIA-M-PTH", name: "M - Putih", attributes: { size: "M", color: "Putih" }, price: 89_000, stock: 150, weight: 200 },
    ],
    images: [
      { url: img(600, 800, "Kaos Pria"), altText: "Kaos polos hitam tampak depan", isPrimary: true },
      { url: img(600, 800, "Kaos Detail"), altText: "Detail bahan kaos", isPrimary: false },
    ],
  },

  // ── Skincare ──────────────────────────────────────────────────────────────
  {
    categorySlug: "skincare",
    name: "Glowing Serum Vitamin C",
    slug: "glowing-serum-vitamin-c",
    description:
      "Serum vitamin C dengan konsentrasi 15% yang efektif mencerahkan wajah dan meratakan warna kulit. " +
      "Diformulasikan dengan niacinamide dan hyaluronic acid untuk hasil maksimal.",
    shortDescription: "Vitamin C 15%, mencerahkan dan meratakan kulit",
    tags: ["skincare", "serum", "vitamin-c", "brightening"],
    status: "active",
    variants: [
      {
        sku: "SERUM-VC-30ML",
        name: "30ml",
        attributes: { size: "30ml" },
        price: 189_000,
        compareAtPrice: 250_000,
        stock: 200,
        weight: 100,
      },
      {
        sku: "SERUM-VC-50ML",
        name: "50ml",
        attributes: { size: "50ml" },
        price: 289_000,
        compareAtPrice: 380_000,
        stock: 150,
        weight: 150,
      },
    ],
    images: [
      { url: img(600, 800, "Vitamin C Serum"), altText: "Glowing Serum Vitamin C", isPrimary: true },
    ],
  },

  // ── Sepatu Olahraga (draft) ────────────────────────────────────────────────
  {
    categorySlug: "sepatu-olahraga",
    name: "RunFast Pro Sepatu Lari",
    slug: "runfast-pro-sepatu-lari",
    description:
      "Sepatu lari dengan teknologi foam responsif dan sol anti-slip. " +
      "Bobot ringan hanya 280g dengan upper mesh yang breathable.",
    shortDescription: "Foam responsif, bobot 280g, sol anti-slip",
    tags: ["sepatu", "olahraga", "lari", "running"],
    status: "draft",
    variants: [
      { sku: "RF-PRO-40-HTM", name: "40 - Hitam", attributes: { size: "40", color: "Hitam" }, price: 699_000, stock: 20, weight: 560 },
      { sku: "RF-PRO-41-HTM", name: "41 - Hitam", attributes: { size: "41", color: "Hitam" }, price: 699_000, stock: 25, weight: 580 },
      { sku: "RF-PRO-42-HTM", name: "42 - Hitam", attributes: { size: "42", color: "Hitam" }, price: 699_000, stock: 30, weight: 600 },
      { sku: "RF-PRO-43-HTM", name: "43 - Hitam", attributes: { size: "43", color: "Hitam" }, price: 699_000, stock: 25, weight: 620 },
      { sku: "RF-PRO-44-HTM", name: "44 - Hitam", attributes: { size: "44", color: "Hitam" }, price: 699_000, stock: 15, weight: 640 },
    ],
    images: [
      { url: img(800, 600, "RunFast Pro"), altText: "RunFast Pro tampak samping", isPrimary: true },
      { url: img(800, 600, "RF Sol"), altText: "Detail sol RunFast Pro", isPrimary: false },
    ],
  },
];

// ── Seed function ─────────────────────────────────────────────────────────────

export async function seedProducts(db: DrizzleClient): Promise<void> {
  console.info("🌱 Seeding products…");

  // Build slug → id map for categories
  const categories = await db
    .select({ id: categoriesTable.id, slug: categoriesTable.slug })
    .from(categoriesTable);
  const categoryMap = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  let productCount = 0;
  let variantCount = 0;
  let imageCount = 0;

  for (const product of PRODUCTS) {
    const categoryId = categoryMap[product.categorySlug];
    if (!categoryId) {
      console.warn(`   ⚠ Category '${product.categorySlug}' not found — skipping '${product.name}'`);
      continue;
    }

    // Insert product
    const [inserted] = await db
      .insert(productsTable)
      .values({
        name: product.name,
        slug: product.slug,
        description: product.description,
        shortDescription: product.shortDescription,
        status: product.status,
        categoryId,
        tags: product.tags,
      })
      .onConflictDoNothing({ target: productsTable.slug })
      .returning({ id: productsTable.id });

    if (!inserted) continue; // already exists
    productCount++;

    // Insert variants
    const insertedVariants = await db
      .insert(productVariantsTable)
      .values(product.variants.map((v) => ({ ...v, productId: inserted.id })))
      .onConflictDoNothing({ target: productVariantsTable.sku })
      .returning({ id: productVariantsTable.id });
    variantCount += insertedVariants.length;

    // Insert images
    const insertedImages = await db
      .insert(productImagesTable)
      .values(
        product.images.map((img, idx) => ({
          ...img,
          productId: inserted.id,
          sortOrder: idx,
        }))
      )
      .returning({ id: productImagesTable.id });
    imageCount += insertedImages.length;
  }

  console.info(`   ✓ ${productCount} products, ${variantCount} variants, ${imageCount} images inserted`);
}
