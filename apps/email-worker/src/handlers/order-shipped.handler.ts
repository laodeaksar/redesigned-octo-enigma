// =============================================================================
// Order shipped email handler
// Queue: email.order-shipped
// =============================================================================

import { QUEUES } from "@repo/common/events";
import type { OrderShippedEmailJobData } from "@repo/common/types";
import { z } from "zod";
import { createEmailHandler } from "@/lib/create-email-handler";
import { orderShippedTemplate } from "@/lib/templates";

const schema = z.object({
  orderId: z.string().min(1),
  orderNumber: z.string().min(1),
  email: z.string().email(),
  courier: z.string().min(1),
  trackingNumber: z.string().nullable(),
  address: z.object({
    recipientName: z.string(),
    city: z.string(),
    province: z.string(),
  }),
});

export const handleOrderShippedEmail =
  createEmailHandler<OrderShippedEmailJobData>({
    queueName: QUEUES.EMAIL_ORDER_SHIPPED,
    schema,
    getTemplate: (data) => orderShippedTemplate(data),
    getExtraHeaders: (data) => ({
      "X-Order-Number": data.orderNumber,
    }),
  });
