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

const DEFAULT_WORKER_OPTS = {
  concurrency: 5,
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
  removeOnComplete: { age: 86400, count: 1000 },
  removeOnFail: { age: 604800 },
} as const;

const BINDINGS: WorkerBinding[] = [
  {
    queue: QUEUES.EMAIL_WELCOME,
    processor: handleWelcomeEmail,
    options: DEFAULT_WORKER_OPTS,
  },
  {
    queue: QUEUES.EMAIL_ORDER_CONFIRMATION,
    processor: handleOrderConfirmationEmail,
    options: DEFAULT_WORKER_OPTS,
  },
  {
    queue: QUEUES.EMAIL_ORDER_SHIPPED,
    processor: handleOrderShippedEmail,
    options: DEFAULT_WORKER_OPTS,
  },
  {
    queue: QUEUES.EMAIL_ORDER_CANCELLED,
    processor: handleOrderCancelledEmail,
    options: DEFAULT_WORKER_OPTS,
  },
  {
    queue: QUEUES.EMAIL_PASSWORD_RESET,
    processor: handlePasswordResetEmail,
    options: DEFAULT_WORKER_OPTS,
  },
];

/**
 * Start all BullMQ workers and return the instances for shutdown handling.
 */
export function startWorkers(): Worker[] {
  const workers = createWorkers(BINDINGS, redis);

  workers.forEach((worker, idx) => {
    const queueName = BINDINGS[idx]?.queue;
    worker.on("completed", (job) =>
      console.info(`[${queueName}] Job ${job.id} completed`),
    );
    worker.on("failed", (job, err) =>
      console.error(`[${queueName}] Job ${job?.id} failed:`, err.message),
    );
  });

  console.info(`\n📬 Consuming ${workers.length} queue(s):`);
  BINDINGS.forEach((b) => console.info(`   - ${b.queue}`));
  console.info("");

  const shutdown = async (signal: string) => {
    console.info(`\n${signal} received, closing workers...`);
    await closeWorkers(workers);
    await redis.quit();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  return workers;
}

export { closeWorkers };
