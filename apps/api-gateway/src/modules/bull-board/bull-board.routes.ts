// =============================================================================
// Bull Board — job queue monitoring dashboard
// Route: /admin/queues  (admin-only, basic-auth protected in production)
//
// Shows all queues from all services that connect to the same Redis instance:
//   - email.welcome, email.order-confirmation, email.order-shipped,
//     email.order-cancelled, email.password-reset
//   - product.stock-deduct, product.stock-restore
//   - order.payment-confirmed, order.cancel-expired
// =============================================================================

import { Hono } from "hono";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import { Queue } from "bullmq";

import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { getRedis, env } from "@/config";
import { QUEUES } from "@my-ecommerce/common/events";

// ── Build queue list ──────────────────────────────────────────────────────────

function createQueueAdapters() {
  const redis = getRedis();
  const connection = redis as unknown as Parameters<typeof Queue>[1]["connection"];

  const queueNames = Object.values(QUEUES);

  return queueNames.map(
    (name) =>
      new BullMQAdapter(
        new Queue(name, { connection }),
        { readOnlyMode: false }
      )
  );
}

// ── Hono adapter setup ────────────────────────────────────────────────────────

const serverAdapter = new HonoAdapter(
  // Static assets base path — Bull Board serves its UI assets from here
  "/admin/queues/ui"
);

createBullBoard({
  queues:        createQueueAdapters(),
  serverAdapter,
  options: {
    uiConfig: {
      boardTitle:   "My Ecommerce — Job Queues",
      boardLogo: {
        path:   "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' d='M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'/%3E%3C/svg%3E",
        width:  "24px",
      },
      miscLinks: [
        { text: "Back to Admin", url: "/_admin/dashboard" },
        { text: "API Docs", url: "/docs" },
      ],
    },
  },
});

// ── Hono app ──────────────────────────────────────────────────────────────────

const app = new Hono();

// Protect the queue dashboard — admin only
app.use("/admin/queues/*", requireAuth, requireRole("admin", "super_admin"));

// Mount Bull Board's routes under /admin/queues
app.route("/admin/queues", serverAdapter.registerPlugin());

export { app as bullBoardRoutes };

