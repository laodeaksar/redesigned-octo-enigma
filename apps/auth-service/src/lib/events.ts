// =============================================================================
// Auth service — BullMQ job publishers
// =============================================================================

import { addUniqueJob, IMPORTANT_JOB_OPTIONS } from "@repo/common/events";
import type {
  WelcomeEmailJobData,
  PasswordResetEmailJobData,
} from "@my-ecommerce/common/types";
import { queues } from "@/config";

export async function publishUserRegistered(payload: WelcomeEmailJobData): Promise<void> {
  // Unique job per userId — prevents duplicate welcome emails on retry
  await addUniqueJob(
    queues.emailWelcome,
    payload,
    `welcome:${payload.userId}`,
    IMPORTANT_JOB_OPTIONS
  );
}

export async function publishPasswordResetRequested(
  payload: PasswordResetEmailJobData
): Promise<void> {
  // Unique per token — prevents double-send on retry
  await addUniqueJob(
    queues.emailPasswordReset,
    payload,
    `password-reset:${payload.resetToken}`
  );
}

