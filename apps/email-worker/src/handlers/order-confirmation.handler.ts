// =============================================================================
// Order confirmation email handler
// Queue: email.order-confirmation
// =============================================================================

import type { Processor } from "@repo/common/events";
import type { OrderConfirmationEmailJobData } from "@repo/common/types";
import { sendEmail } from "@/lib/mailer";
import { orderConfirmationTemplate } from "@/lib/templates";

export const handleOrderConfirmationEmail: Processor<OrderConfirmationEmailJobData> =
  async (job) => {
    const template = orderConfirmationTemplate(job.data);

    const result = await sendEmail({
      to: job.data.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.info(
      `[order-confirmation] Job ${job.id} — sent for ${job.data.orderNumber} to ${job.data.email} (${result.messageId})`
    );
  };

