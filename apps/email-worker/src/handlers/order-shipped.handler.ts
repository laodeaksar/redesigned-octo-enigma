// =============================================================================
// Order shipped email handler
// Queue: email.order-shipped
// =============================================================================

import type { Processor } from "@repo/common/events";
import type { OrderShippedEmailJobData } from "@repo/common/types";
import { sendEmail } from "@/lib/mailer";
import { orderShippedTemplate } from "@/lib/templates";

export const handleOrderShippedEmail: Processor<OrderShippedEmailJobData> =
  async (job) => {
    const template = orderShippedTemplate(job.data);

    const result = await sendEmail({
      to: job.data.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.info(
      `[order-shipped] Job ${job.id} — sent for ${job.data.orderNumber} to ${job.data.email} (${result.messageId})`
    );
  };

