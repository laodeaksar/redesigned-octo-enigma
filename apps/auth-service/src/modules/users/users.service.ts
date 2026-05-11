// =============================================================================
// Users service — profile and address management
// =============================================================================

import type { DB } from "@/config";

import {
  InvalidCredentialsError,
  NotFoundError,
  UserNotFoundError,
} from "@repo/common/errors";
import type {
  ChangePasswordInput,
  CreateAddressInput,
  UpdateAddressInput,
  UpdateProfileInput,
} from "@repo/common/schemas";

import * as repo from "./users.repository";

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(db: DB, userId: string) {
  const user = await repo.findUserById(db, userId);
  if (!user) {
    throw new UserNotFoundError();
  }

  const { passwordHash, emailVerificationToken, passwordResetToken, ...safe } =
    user;
  return safe;
}

export async function updateProfile(
  db: DB,
  userId: string,
  input: UpdateProfileInput
) {
  const user = await repo.updateUser(db, userId, {
    ...(input.name ? { name: input.name } : {}),
    ...(input.avatarUrl === undefined ? {} : { avatarUrl: input.avatarUrl }),
  });

  if (!user) {
    throw new UserNotFoundError();
  }

  const { passwordHash, emailVerificationToken, passwordResetToken, ...safe } =
    user;
  return safe;
}

// ── Password ──────────────────────────────────────────────────────────────────

export async function changePassword(
  db: DB,
  userId: string,
  input: ChangePasswordInput
) {
  const user = await repo.findUserById(db, userId);
  if (!user) {
    throw new UserNotFoundError();
  }

  if (!user.passwordHash) {
    throw new InvalidCredentialsError(
      "Account does not use password authentication"
    );
  }

  const isValid = await Bun.password.verify(
    input.currentPassword,
    user.passwordHash
  );
  if (!isValid) {
    throw new InvalidCredentialsError("Current password is incorrect");
  }

  const passwordHash = await Bun.password.hash(input.newPassword, {
    algorithm: "argon2id",
  });

  await repo.updateUser(db, userId, { passwordHash });

  return { message: "Password changed successfully" };
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
  if (!existing) {
    throw new NotFoundError("Address");
  }

  const updated = await repo.updateAddress(db, addressId, userId, input);
  if (!updated) {
    throw new NotFoundError("Address");
  }

  return updated;
}

export async function deleteAddress(db: DB, userId: string, addressId: string) {
  const deleted = await repo.deleteAddress(db, addressId, userId);
  if (!deleted) {
    throw new NotFoundError("Address");
  }

  return { message: "Address deleted successfully" };
}
