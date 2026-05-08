// =============================================================================
// Auth service — BullMQ job publishers (no-ops when Redis unavailable)
// =============================================================================

import type {
  PasswordResetEmailJobData,
  WelcomeEmailJobData,
} from "@repo/common/types";

export async function publishUserRegistered(
  _payload: WelcomeEmailJobData
): Promise<void> {
  // No-op: BullMQ/Redis not available in this environment
}

export async function publishPasswordResetRequested(
  _payload: PasswordResetEmailJobData
): Promise<void> {
  // No-op: BullMQ/Redis not available in this environment
}
