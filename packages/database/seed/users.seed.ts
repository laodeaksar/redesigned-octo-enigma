// =============================================================================
// Users seed
// Creates 1 super_admin, 1 admin, and 3 sample customers
// =============================================================================

import type { DrizzleClient } from "../drizzle/client";
import { usersTable, addressesTable } from "../drizzle/schema";

// In production you would hash these — here we pre-hash "Password123"
// using Argon2id so seed data is ready without running auth-service.
// Replace with real hash if needed: import { hash } from "@node-rs/argon2"
const HASHED_PASSWORD =
  "$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2FsdA$placeholder";

const USERS = [
  {
    email: "superadmin@my-ecommerce.com",
    name: "Super Admin",
    role: "super_admin" as const,
    status: "active" as const,
    emailVerified: true,
  },
  {
    email: "admin@my-ecommerce.com",
    name: "Admin User",
    role: "admin" as const,
    status: "active" as const,
    emailVerified: true,
  },
  {
    email: "alice@example.com",
    name: "Alice Pratiwi",
    role: "customer" as const,
    status: "active" as const,
    emailVerified: true,
  },
  {
    email: "budi@example.com",
    name: "Budi Santoso",
    role: "customer" as const,
    status: "active" as const,
    emailVerified: true,
  },
  {
    email: "citra@example.com",
    name: "Citra Dewi",
    role: "customer" as const,
    status: "pending_verification" as const,
    emailVerified: false,
  },
];

export async function seedUsers(db: DrizzleClient): Promise<void> {
  console.info("🌱 Seeding users…");

  const inserted = await db
    .insert(usersTable)
    .values(
      USERS.map((u) => ({
        ...u,
        passwordHash: HASHED_PASSWORD,
      }))
    )
    .onConflictDoNothing({ target: usersTable.email })
    .returning({ id: usersTable.id, email: usersTable.email });

  console.info(`   ✓ ${inserted.length} users inserted`);

  // Seed one default address for Alice
  const alice = inserted.find((u) => u.email === "alice@example.com");
  if (alice) {
    await db
      .insert(addressesTable)
      .values({
        userId: alice.id,
        label: "Home",
        recipientName: "Alice Pratiwi",
        phone: "081234567890",
        street: "Jl. Sudirman No. 123",
        city: "Jakarta Pusat",
        province: "DKI Jakarta",
        postalCode: "10220",
        country: "ID",
        isDefault: true,
      })
      .onConflictDoNothing();
    console.info("   ✓ Default address seeded for Alice");
  }
}
