import { swagger } from "@elysiajs/swagger";

export const swaggerPlugin = swagger({
  documentation: {
    info: {
      title: "Order Service API",
      version: "1.0.0",
      description: "Order lifecycle management — create, track, ship, cancel",
    },
    tags: [
      { name: "Health", description: "Service health check" },
      { name: "Orders", description: "Order CRUD and lifecycle transitions" },
      { name: "Vouchers", description: "Voucher validation and admin management" },
    ],
  },
  path: "/docs",
});

