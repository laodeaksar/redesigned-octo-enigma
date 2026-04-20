import { swagger } from "@elysiajs/swagger";

export const swaggerPlugin = swagger({
  documentation: {
    info: {
      title: "Product Service API",
      version: "1.0.0",
      description: "Product catalogue, categories, variants, stock, and reviews",
    },
    tags: [
      { name: "Health", description: "Service health check" },
      { name: "Categories", description: "Category tree management" },
      { name: "Products", description: "Product CRUD and listing" },
      { name: "Variants", description: "Product variant management" },
      { name: "Images", description: "Product image management" },
      { name: "Stock", description: "Stock adjustment (internal)" },
      { name: "Reviews", description: "Product reviews and ratings" },
    ],
    components: {
      securitySchemes: {
        internalHeaders: {
          type: "apiKey",
          in: "header",
          name: "x-user-id",
          description: "Injected by api-gateway after JWT validation",
        },
      },
    },
  },
  path: "/docs",
});

