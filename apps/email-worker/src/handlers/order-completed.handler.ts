// =============================================================================
// Order completed email handler
// Queue: email.order-completed
// =============================================================================

import { z } from "zod";

import { QUEUES } from "@repo/common/events";
import type { OrderCompletedEmailJobData } from "@repo/common/types";

import { createEmailHandler } from "@/lib/create-email-handler";
import { orderCompletedTemplate } from "@/lib/templates";

const schema = z.object({
  orderId: z.string().min(1),
  orderNumber: z.string().min(1),
  email: z.string().email(),
  grandTotal: z.number().nonnegative(),
});

export const handleOrderCompletedEmail =
  createEmailHandler<OrderCompletedEmailJobData>({
    queueName: QUEUES.EMAIL_ORDER_COMPLETED,
    schema,
    getTemplate: data => orderCompletedTemplate(data),
    getExtraHeaders: data => ({
      "X-Order-Number": data.orderNumber,
    }),
  });
