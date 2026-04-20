import { swagger } from "@elysiajs/swagger";

export const swaggerPlugin = swagger({
  documentation: {
    info: {
      title: "Payment Service API",
      version: "1.0.0",
      description: "Midtrans payment processing — create, verify, and refund",
    },
    tags: [
      { name: "Health", description: "Service health check" },
      { name: "Payments", description: "Create and manage payments" },
      { name: "Webhook", description: "Midtrans HTTP notification endpoint" },
      { name: "Refunds", description: "Initiate and track refunds" },
    ],
  },
  path: "/docs",
});

