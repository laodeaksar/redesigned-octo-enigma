// =============================================================================
// Users repository — all database operations for users + addresses
// =============================================================================

import { eq, and, desc } from "drizzle-orm";

import {
  usersTable,
  addressesTable,
  type UserRow,
  type NewUserRow,
  type AddressRow,
  type NewAddressRow,
} from "@repo/database/drizzle/schema";

import type { DB } from "@/config";

// ── Users ─────────────────────────────────────────────────────────────────────

export async function findUserById(
  db: DB,
  id: string
): Promise<UserRow | undefined> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);
  return user;
}

export async function findUserByEmail(
  db: DB,
  email: string
): Promise<UserRow | undefined> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);
  return user;
}

export async function findUserByVerificationToken(
  db: DB,
  token: string
): Promise<UserRow | undefined> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.emailVerificationToken, token))
    .limit(1);
  return user;
}

export async function findUserByResetToken(
  db: DB,
  token: string
): Promise<UserRow | undefined> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.passwordResetToken, token))
    .limit(1);
  return user;
}

export async function createUser(
  db: DB,
  data: NewUserRow
): Promise<UserRow> {
  const [user] = await db.insert(usersTable).values(data).returning();
  return user!;
}

export async function updateUser(
  db: DB,
  id: string,
  data: Partial<NewUserRow>
): Promise<UserRow | undefined> {
  const [user] = await db
    .update(usersTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning();
  return user;
}

// ── Addresses ─────────────────────────────────────────────────────────────────

export async function findAddressesByUserId(
  db: DB,
  userId: string
): Promise<AddressRow[]> {
  return db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, userId))
    .orderBy(desc(addressesTable.isDefault), desc(addressesTable.createdAt));
}

export async function findAddressById(
  db: DB,
  id: string,
  userId: string
): Promise<AddressRow | undefined> {
  const [address] = await db
    .select()
    .from(addressesTable)
    .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)))
    .limit(1);
  return address;
}

export async function createAddress(
  db: DB,
  data: NewAddressRow
): Promise<AddressRow> {
  // If this is a default address, unset any existing default first
  if (data.isDefault) {
    await db
      .update(addressesTable)
      .set({ isDefault: false })
      .where(eq(addressesTable.userId, data.userId));
  }

  const [address] = await db.insert(addressesTable).values(data).returning();
  return address!;
}

export async function updateAddress(
  db: DB,
  id: string,
  userId: string,
  data: Partial<NewAddressRow>
): Promise<AddressRow | undefined> {
  // If being set as default, unset others first
  if (data.isDefault) {
    await db
      .update(addressesTable)
      .set({ isDefault: false })
      .where(eq(addressesTable.userId, userId));
  }

  const [address] = await db
    .update(addressesTable)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)))
    .returning();
  return address;
}

export async function deleteAddress(
  db: DB,
  id: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .delete(addressesTable)
    .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)))
    .returning({ id: addressesTable.id });
  return result.length > 0;
}

