// =============================================================================
// Order cancelled email handler
// Queue: email.order-cancelled
// =============================================================================

import { QUEUES } from "@repo/common/events";
import type { OrderCancelledEmailJobData } from "@repo/common/types";
import { z } from "zod";
import { createEmailHandler } from "@/lib/create-email-handler";
import { orderCancelledTemplate } from "@/lib/templates";

const schema = z.object({
  orderId: z.string().min(1),
  orderNumber: z.string().min(1),
  email: z.string().email(),
  reason: z.string().nullable(),
  grandTotal: z.number().nonnegative(),
});

export const handleOrderCancelledEmail =
  createEmailHandler<OrderCancelledEmailJobData>({
    queueName: QUEUES.EMAIL_ORDER_CANCELLED,
    schema,
    getTemplate: (data) => orderCancelledTemplate(data),
    getExtraHeaders: (data) => ({
      "X-Order-Number": data.orderNumber,
    }),
  });
