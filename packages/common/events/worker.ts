// =============================================================================
// BullMQ Worker — typed Worker factory
//
// Usage:
//   const worker = createWorker(QUEUES.EMAIL_WELCOME, async (job) => {
//     await sendWelcomeEmail(job.data)
//   }, redis, { concurrency: 5 })
// =============================================================================

import {
  Worker,
  type Processor,
  type WorkerOptions,
  type ConnectionOptions,
  type Job,
} from "bullmq";
import type Redis from "ioredis";

// ── Re-export BullMQ types used by handlers ───────────────────────────────────
export type { Processor, Job };

// ── Worker factory ────────────────────────────────────────────────────────────

export interface CreateWorkerOptions {
  /** Max concurrent jobs processed in this worker instance (default: 10) */
  concurrency?: number;
  /** Rate-limit: max jobs per duration window */
  limiter?: { max: number; duration: number };
  /** Stalledinterval in ms (default: 30_000) */
  stalledInterval?: number;
}

/**
 * Create a typed BullMQ Worker for the given queue.
 * Attaches error + completed + failed event listeners automatically.
 *
 * @param queueName   Queue name to consume from
 * @param processor   Async function that processes each job
 * @param redis       Shared ioredis instance
 * @param opts        Worker options
 */
export function createWorker<TData = unknown, TResult = void>(
  queueName: string,
  processor: Processor<TData, TResult>,
  redis: Redis,
  opts: CreateWorkerOptions = {}
): Worker<TData, TResult> {
  const {
    concurrency = 10,
    limiter,
    stalledInterval = 30_000,
  } = opts;

  const workerOptions: WorkerOptions = {
    connection: redis as unknown as ConnectionOptions,
    concurrency,
    stalledInterval,
    ...(limiter ? { limiter } : {}),
  };

  const worker = new Worker<TData, TResult>(queueName, processor, workerOptions);

  // ── Event listeners ────────────────────────────────────────────────────────

  worker.on("completed", (job) => {
    console.info(
      `[${queueName}] Job ${job.id} completed in ${job.processedOn! - job.timestamp}ms`
    );
  });

  worker.on("failed", (job, err) => {
    const attempts = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts?.attempts ?? 3;

    if (attempts >= maxAttempts) {
      console.error(
        `[${queueName}] Job ${job?.id} failed permanently after ${attempts} attempts:`,
        err.message
      );
    } else {
      console.warn(
        `[${queueName}] Job ${job?.id} failed (attempt ${attempts}/${maxAttempts}):`,
        err.message
      );
    }
  });

  worker.on("error", (err) => {
    console.error(`[${queueName}] Worker error:`, err.message);
  });

  worker.on("stalled", (jobId) => {
    console.warn(`[${queueName}] Job ${jobId} stalled — will be retried`);
  });

  console.info(
    `[${queueName}] Worker started (concurrency: ${concurrency})`
  );

  return worker;
}

// ── Multi-queue worker setup ──────────────────────────────────────────────────

export interface WorkerBinding<TData = any> {
  queue: string;
  processor: Processor<TData>;
  options?: CreateWorkerOptions;
}

/**
 * Start multiple workers from a binding array.
 * Returns all worker instances for shutdown handling.
 */
export function createWorkers(
  bindings: WorkerBinding[],
  redis: Redis
): Worker[] {
  return bindings.map(({ queue, processor, options }) =>
    createWorker(queue, processor as Processor, redis, options)
  );
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────

/**
 * Gracefully close all workers — waits for in-flight jobs to complete.
 *
 * @param workers   Array of Worker instances to close
 * @param force     If true, forcefully close without waiting (default: false)
 */
export async function closeWorkers(
  workers: Worker[],
  force = false
): Promise<void> {
  await Promise.all(
    workers.map((w) => {
      console.info(`[${w.name}] Closing worker…`);
      return w.close(force);
    })
  );
  console.info("All workers closed.");
}

