// =============================================================================
// Users controller
// =============================================================================

import { success } from "@repo/common/schemas";
import { safeParse } from "@repo/common/errors";
import {
  updateProfileSchema,
  createAddressSchema,
  updateAddressSchema,
} from "@repo/common/schemas";

import * as usersService from "./users.service";
import type { DB } from "@/config";

export async function handleGetProfile(db: DB, userId: string) {
  const profile = await usersService.getProfile(db, userId);
  return success(profile);
}

export async function handleUpdateProfile(
  db: DB,
  userId: string,
  body: unknown
) {
  const input = safeParse(updateProfileSchema, body);
  const profile = await usersService.updateProfile(db, userId, input);
  return success(profile, "Profile updated successfully");
}

export async function handleListAddresses(db: DB, userId: string) {
  const addresses = await usersService.listAddresses(db, userId);
  return success(addresses);
}

export async function handleCreateAddress(
  db: DB,
  userId: string,
  body: unknown
) {
  const input = safeParse(createAddressSchema, body);
  const address = await usersService.createAddress(db, userId, input);
  return success(address, "Address added successfully");
}

export async function handleUpdateAddress(
  db: DB,
  userId: string,
  addressId: string,
  body: unknown
) {
  const input = safeParse(updateAddressSchema, body);
  const address = await usersService.updateAddress(db, userId, addressId, input);
  return success(address, "Address updated successfully");
}

export async function handleDeleteAddress(
  db: DB,
  userId: string,
  addressId: string
) {
  const result = await usersService.deleteAddress(db, userId, addressId);
  return success(result);
}

