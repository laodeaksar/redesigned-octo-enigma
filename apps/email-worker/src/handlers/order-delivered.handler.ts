// =============================================================================
// Order delivered email handler
// Queue: email.order-delivered
// =============================================================================

import { z } from "zod";

import { QUEUES } from "@repo/common/events";
import type { OrderDeliveredEmailJobData } from "@repo/common/types";

import { createEmailHandler } from "@/lib/create-email-handler";
import { orderDeliveredTemplate } from "@/lib/templates";

const schema = z.object({
  orderId: z.string().min(1),
  orderNumber: z.string().min(1),
  email: z.string().email(),
  grandTotal: z.number().nonnegative(),
  address: z.object({
    recipientName: z.string(),
    city: z.string(),
    province: z.string(),
  }),
});

export const handleOrderDeliveredEmail =
  createEmailHandler<OrderDeliveredEmailJobData>({
    queueName: QUEUES.EMAIL_ORDER_DELIVERED,
    schema,
    getTemplate: data => orderDeliveredTemplate(data),
    getExtraHeaders: data => ({
      "X-Order-Number": data.orderNumber,
    }),
  });
