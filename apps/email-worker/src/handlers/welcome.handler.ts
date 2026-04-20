// =============================================================================
// Welcome email handler
// Queue: email.welcome
// =============================================================================

import type { Processor } from "@repo/common/events";
import type { WelcomeEmailJobData } from "@repo/common/types";
import { sendEmail } from "@/lib/mailer";
import { welcomeTemplate } from "@/lib/templates";

export const handleWelcomeEmail: Processor<WelcomeEmailJobData> = async (job) => {
  const { email, name } = job.data;

  const template = welcomeTemplate({ name, email });

  const result = await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  console.info(
    `[welcome] Job ${job.id} — sent to ${email} via ${result.provider} (${result.messageId})`
  );
};

