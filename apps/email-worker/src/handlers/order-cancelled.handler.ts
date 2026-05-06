// =============================================================================
// Order cancelled email handler
// Queue: email.order-cancelled
// =============================================================================

import { z } from "zod";
import type { OrderCancelledEmailJobData } from "@repo/common/types";
import { orderCancelledTemplate } from "@/lib/templates";
import { createEmailHandler } from "@/lib/create-email-handler";
import { QUEUES } from "@repo/common/events";

const schema = z.object({
  orderId:     z.string().min(1),
  orderNumber: z.string().min(1),
  email:       z.string().email(),
  reason:      z.string().nullable(),
  grandTotal:  z.number().nonnegative(),
});

export const handleOrderCancelledEmail =
  createEmailHandler<OrderCancelledEmailJobData>({
    queueName:   QUEUES.EMAIL_ORDER_CANCELLED,
    schema,
    getTemplate: (data) => orderCancelledTemplate(data),
    getExtraHeaders: (data) => ({
      "X-Order-Number": data.orderNumber,
    }),
  });
