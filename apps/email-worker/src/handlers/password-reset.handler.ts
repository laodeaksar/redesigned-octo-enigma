// =============================================================================
// Password reset email handler
// Queue: email.password-reset
// =============================================================================

import type { Processor } from "@repo/common/events";
import type { PasswordResetEmailJobData } from "@repo/common/types";
import { sendEmail } from "@/lib/mailer";
import { passwordResetTemplate } from "@/lib/templates";

export const handlePasswordResetEmail: Processor<PasswordResetEmailJobData> =
  async (job) => {
    const template = passwordResetTemplate(job.data);

    const result = await sendEmail({
      to: job.data.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.info(
      `[password-reset] Job ${job.id} — sent to ${job.data.email} (${result.messageId})`
    );
  };

