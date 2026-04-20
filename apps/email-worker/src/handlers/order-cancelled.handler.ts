// =============================================================================
// Order cancelled email handler
// Queue: email.order-cancelled
// =============================================================================

import type { Processor } from "@repo/common/events";
import type { OrderCancelledEmailJobData } from "@repo/common/types";
import { sendEmail } from "@/lib/mailer";
import { orderCancelledTemplate } from "@/lib/templates";

export const handleOrderCancelledEmail: Processor<OrderCancelledEmailJobData> =
  async (job) => {
    const template = orderCancelledTemplate(job.data);

    const result = await sendEmail({
      to: job.data.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.info(
      `[order-cancelled] Job ${job.id} — sent for ${job.data.orderNumber} to ${job.data.email} (${result.messageId})`
    );
  };

