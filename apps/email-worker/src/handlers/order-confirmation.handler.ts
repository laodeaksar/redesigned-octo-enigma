// =============================================================================
// Order confirmation email handler
// Queue: email.order-confirmation
// =============================================================================

import { z } from "zod";

import { QUEUES } from "@repo/common/events";
import type { OrderConfirmationEmailJobData } from "@repo/common/types";

import { createEmailHandler } from "@/lib/create-email-handler";
import { orderConfirmationTemplate } from "@/lib/templates";

const orderItemSchema = z.object({
  name: z.string(),
  variantName: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
});

const schema = z.object({
  orderId: z.string().min(1),
  orderNumber: z.string().min(1),
  email: z.string().email(),
  items: z.array(orderItemSchema).min(1),
  pricing: z.object({
    subtotal: z.number().nonnegative(),
    shippingCost: z.number().nonnegative(),
    discountTotal: z.number().nonnegative(),
    taxTotal: z.number().nonnegative(),
    grandTotal: z.number().nonnegative(),
  }),
  shipping: z.object({
    courier: z.string(),
    service: z.string(),
    address: z.object({
      recipientName: z.string(),
      phone: z.string(),
      street: z.string(),
      city: z.string(),
      province: z.string(),
      postalCode: z.string(),
    }),
  }),
  expiresAt: z.string(),
});

export const handleOrderConfirmationEmail =
  createEmailHandler<OrderConfirmationEmailJobData>({
    queueName: QUEUES.EMAIL_ORDER_CONFIRMATION,
    schema,
    getTemplate: data => orderConfirmationTemplate(data),
    getExtraHeaders: data => ({
      "X-Order-Number": data.orderNumber,
    }),
  });
