// =============================================================================
// Swagger plugin — API docs at /docs
// =============================================================================

import { swagger } from "@elysiajs/swagger";

export const swaggerPlugin = swagger({
  documentation: {
    info: {
      title: "Auth Service API",
      version: "1.0.0",
      description:
        "Authentication, session management, and user profile endpoints",
    },
    tags: [
      { name: "Health", description: "Service health check" },
      { name: "Auth", description: "Register, login, logout, tokens" },
      { name: "Users", description: "Profile and address management" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  path: "/docs",
});

