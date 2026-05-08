// =============================================================================
// Password reset email handler
// Queue: email.password-reset
// =============================================================================

import { QUEUES } from "@repo/common/events";
import type { PasswordResetEmailJobData } from "@repo/common/types";
import { z } from "zod";
import { createEmailHandler } from "@/lib/create-email-handler";
import { passwordResetTemplate } from "@/lib/templates";

const schema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  resetToken: z.string().min(1),
  expiresAt: z.string(),
});

export const handlePasswordResetEmail =
  createEmailHandler<PasswordResetEmailJobData>({
    queueName: QUEUES.EMAIL_PASSWORD_RESET,
    schema,
    getTemplate: (data) => passwordResetTemplate(data),
    rateLimitSec: 60,
    checkExpiry: (data) => new Date(data.expiresAt) < new Date(),
  });
