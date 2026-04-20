// =============================================================================
// BullMQ Producer — typed Queue factory
//
// Usage:
//   const queue = createQueue(QUEUES.EMAIL_WELCOME, redis)
//   await queue.add("send", payload, jobOptions)
//
//   // Or use addJob() for pre-wired defaults:
//   await addJob(queue, payload)
// =============================================================================

import { Queue, type ConnectionOptions, type JobsOptions } from "bullmq";
import type Redis from "ioredis";

// ── Defaults ──────────────────────────────────────────────────────────────────

/** Default job options applied to every job unless overridden */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000,  // 2s → 4s → 8s
  },
  // Keep completed jobs for 24h (useful for debugging)
  removeOnComplete: { age: 86_400, count: 1000 },
  // Keep failed jobs for 7 days
  removeOnFail: { age: 7 * 86_400, count: 5000 },
};

/** High-importance jobs (e.g. order confirmation email) */
export const IMPORTANT_JOB_OPTIONS: JobsOptions = {
  ...DEFAULT_JOB_OPTIONS,
  attempts: 5,
  priority: 1,
  backoff: {
    type: "exponential",
    delay: 1000,
  },
};

// ── Queue factory ─────────────────────────────────────────────────────────────

/**
 * Create a typed BullMQ Queue connected to the given Redis instance.
 *
 * @param name     Queue name (use a value from QUEUES constant)
 * @param redis    Shared ioredis instance
 */
export function createQueue<TData = unknown>(
  name: string,
  redis: Redis
): Queue<TData> {
  return new Queue<TData>(name, {
    connection: redis as unknown as ConnectionOptions,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}

// ── Typed add helper ──────────────────────────────────────────────────────────

/**
 * Add a job with a fixed job name "process" and the given payload.
 * Merges caller options with DEFAULT_JOB_OPTIONS.
 *
 * Usage:
 *   await addJob(emailQueue, { email, name }, { attempts: 5 })
 */
export async function addJob<TData>(
  queue: Queue<TData>,
  data: TData,
  options: JobsOptions = {}
) {
  return queue.add("process", data, {
    ...DEFAULT_JOB_OPTIONS,
    ...options,
  });
}

/**
 * Add a job with a unique jobId — prevents duplicate jobs for the same entity.
 *
 * Usage:
 *   await addUniqueJob(emailQueue, { userId }, `welcome:${userId}`)
 */
export async function addUniqueJob<TData>(
  queue: Queue<TData>,
  data: TData,
  jobId: string,
  options: JobsOptions = {}
) {
  return queue.add("process", data, {
    ...DEFAULT_JOB_OPTIONS,
    ...options,
    jobId,
  });
}

/**
 * Add a delayed job — executes after `delayMs` milliseconds.
 *
 * Usage:
 *   // Auto-cancel an order in 60 minutes
 *   await addDelayedJob(cancelQueue, { orderId }, 60 * 60 * 1000, `cancel:${orderId}`)
 */
export async function addDelayedJob<TData>(
  queue: Queue<TData>,
  data: TData,
  delayMs: number,
  jobId?: string,
  options: JobsOptions = {}
) {
  return queue.add("process", data, {
    ...DEFAULT_JOB_OPTIONS,
    ...options,
    delay: delayMs,
    ...(jobId ? { jobId } : {}),
  });
}

// ── Close queues gracefully ───────────────────────────────────────────────────

export async function closeQueues(queues: Queue[]): Promise<void> {
  await Promise.all(queues.map((q) => q.close()));
}

