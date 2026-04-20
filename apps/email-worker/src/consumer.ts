// =============================================================================
// BullMQ worker wiring — registers all queue → handler bindings
// =============================================================================

import {
  createWorkers,
  closeWorkers,
  QUEUES,
  type WorkerBinding,
  type Worker,
} from "@repo/common/events";
import { redis } from "@/config";
import { handleWelcomeEmail } from "@/handlers/welcome.handler";
import { handleOrderConfirmationEmail } from "@/handlers/order-confirmation.handler";
import { handleOrderShippedEmail } from "@/handlers/order-shipped.handler";
import { handleOrderCancelledEmail } from "@/handlers/order-cancelled.handler";
import { handlePasswordResetEmail } from "@/handlers/password-reset.handler";

const BINDINGS: WorkerBinding[] = [
  {
    queue: QUEUES.EMAIL_WELCOME,
    processor: handleWelcomeEmail,
    options: { concurrency: 5 },
  },
  {
    queue: QUEUES.EMAIL_ORDER_CONFIRMATION,
    processor: handleOrderConfirmationEmail,
    options: { concurrency: 5 },
  },
  {
    queue: QUEUES.EMAIL_ORDER_SHIPPED,
    processor: handleOrderShippedEmail,
    options: { concurrency: 5 },
  },
  {
    queue: QUEUES.EMAIL_ORDER_CANCELLED,
    processor: handleOrderCancelledEmail,
    options: { concurrency: 5 },
  },
  {
    queue: QUEUES.EMAIL_PASSWORD_RESET,
    processor: handlePasswordResetEmail,
    options: { concurrency: 5 },
  },
];

/**
 * Start all BullMQ workers and return the instances for shutdown handling.
 */
export function startWorkers(): Worker[] {
  const workers = createWorkers(BINDINGS, redis);

  console.info(`\n📬 Consuming ${workers.length} queue(s):`);
  BINDINGS.forEach((b) => console.info(`   ${b.queue}`));
  console.info("");

  return workers;
}

export { closeWorkers };

