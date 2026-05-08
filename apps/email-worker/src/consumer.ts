// =============================================================================
// BullMQ worker wiring — registers all queue → handler bindings
// =============================================================================

import { redis } from "@/config";
import { handleOrderCancelledEmail } from "@/handlers/order-cancelled.handler";
import { handleOrderConfirmationEmail } from "@/handlers/order-confirmation.handler";
import { handleOrderShippedEmail } from "@/handlers/order-shipped.handler";
import { handlePasswordResetEmail } from "@/handlers/password-reset.handler";
import { handleSecurityAlertEmail } from "@/handlers/security-alert.handler";
import { handleWelcomeEmail } from "@/handlers/welcome.handler";

import {
  closeWorkers,
  createWorkers,
  QUEUES,
  type Worker,
  type WorkerBinding,
} from "@repo/common/events";

import { logger } from "@/lib/logger";

const DEFAULT_WORKER_OPTS = {
  concurrency: 5,
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { age: 86_400, count: 1000 },
  removeOnFail: { age: 604_800 },
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
  {
    queue: QUEUES.EMAIL_SECURITY_ALERT,
    processor: handleSecurityAlertEmail,
    options: DEFAULT_WORKER_OPTS,
  },
];

/**
 * Start all BullMQ workers and return the instances for graceful shutdown.
 * Shutdown signals are handled by index.ts — do NOT add them here.
 */
export function startWorkers(): Worker[] {
  const workers = createWorkers(BINDINGS, redis);

  workers.forEach((worker, idx) => {
    const queueName = BINDINGS[idx]?.queue ?? "unknown";

    worker.on("completed", job =>
      logger.info({ jobId: job.id, queueName }, "Job completed")
    );
    worker.on("failed", (job, err) =>
      logger.error({ jobId: job?.id, queueName, err }, "Job failed")
    );
    worker.on("stalled", jobId =>
      logger.warn({ jobId, queueName }, "Job stalled — will be retried")
    );
  });

  logger.info(
    { queues: BINDINGS.map(b => b.queue) },
    `📬 Consuming ${workers.length} queue(s)`
  );

  return workers;
}

export { closeWorkers };
