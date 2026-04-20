// =============================================================================
// Users service — profile and address management
// =============================================================================

import {
  UserNotFoundError,
  NotFoundError,
  ForbiddenError,
} from "@repo/common/errors";
import type {
  UpdateProfileInput,
  CreateAddressInput,
  UpdateAddressInput,
} from "@repo/common/schemas";

import * as repo from "./users.repository";
import type { DB } from "@/config";

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(db: DB, userId: string) {
  const user = await repo.findUserById(db, userId);
  if (!user) throw new UserNotFoundError();

  const { passwordHash, emailVerificationToken, passwordResetToken, ...safe } = user;
  return safe;
}

export async function updateProfile(
  db: DB,
  userId: string,
  input: UpdateProfileInput
) {
  const user = await repo.updateUser(db, userId, {
    ...(input.name ? { name: input.name } : {}),
    ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
  });

  if (!user) throw new UserNotFoundError();

  const { passwordHash, emailVerificationToken, passwordResetToken, ...safe } = user;
  return safe;
}

// ── Addresses ─────────────────────────────────────────────────────────────────

export async function listAddresses(db: DB, userId: string) {
  return repo.findAddressesByUserId(db, userId);
}

export async function createAddress(
  db: DB,
  userId: string,
  input: CreateAddressInput
) {
  return repo.createAddress(db, { ...input, userId });
}

export async function updateAddress(
  db: DB,
  userId: string,
  addressId: string,
  input: UpdateAddressInput
) {
  const existing = await repo.findAddressById(db, addressId, userId);
  if (!existing) throw new NotFoundError("Address");

  const updated = await repo.updateAddress(db, addressId, userId, input);
  if (!updated) throw new NotFoundError("Address");

  return updated;
}

export async function deleteAddress(
  db: DB,
  userId: string,
  addressId: string
) {
  const deleted = await repo.deleteAddress(db, addressId, userId);
  if (!deleted) throw new NotFoundError("Address");

  return { message: "Address deleted successfully" };
}

