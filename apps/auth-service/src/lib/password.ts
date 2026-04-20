// =============================================================================
// Password helpers — Argon2id hashing via @node-rs/argon2
// =============================================================================

import { hash, verify, Algorithm } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 65536,   // 64 MiB
  timeCost: 3,
  parallelism: 4,
};

/**
 * Hash a plain-text password.
 * Returns an Argon2id PHC string safe to store in the database.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a plain-text password against a stored Argon2id hash.
 * Returns true if the password matches.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    return await verify(storedHash, password, ARGON2_OPTIONS);
  } catch {
    // malformed hash or other error — treat as mismatch
    return false;
  }
}

