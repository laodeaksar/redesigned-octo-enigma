// =============================================================================
// BullMQ Scheduler — delayed and recurring job helpers
// Replaces: setInterval patterns + RabbitMQ TTL-based scheduling
// =============================================================================

import { Queue, type JobsOptions } from "bullmq";

// ── Recurring jobs ────────────────────────────────────────────────────────────

/**
 * Register a recurring job on a queue using BullMQ's job scheduler.
 * Idempotent — safe to call on every startup.
 *
 * @param queue         BullMQ Queue instance
 * @param schedulerId   Unique ID for this recurring job
 * @param everyMs       Interval in milliseconds
 * @param data          Job data
 * @param options       Extra job options
 *
 * Usage:
 *   // Run order expiry sweep every 5 minutes
 *   await scheduleRecurring(orderCancelQueue, "expire-sweep", 5 * 60_000, {})
 */
export async function scheduleRecurring<TData>(
  queue: Queue,
  schedulerId: string,
  everyMs: number,
  data: TData,
  options: Omit<JobsOptions, "repeat"> = {},
): Promise<void> {
  await queue.upsertJobScheduler(
    schedulerId,
    { every: everyMs },
    {
      name: "recurring",
      data,
      opts: {
        removeOnComplete: { count: 1 },
        removeOnFail: { age: 86_400 },
        ...options,
      },
    },
  );
}

/**
 * Register a cron-based recurring job.
 *
 * @param cronExpression   Standard cron expression e.g. "0 * * * *" (every hour)
 *
 * Usage:
 *   await scheduleCron(reportQueue, "daily-report", "0 8 * * *", { type: "daily" })
 */
export async function scheduleCron<TData>(
  queue: Queue,
  schedulerId: string,
  cronExpression: string,
  data: TData,
  options: Omit<JobsOptions, "repeat"> = {},
): Promise<void> {
  await queue.upsertJobScheduler(
    schedulerId,
    { pattern: cronExpression },
    {
      name: "cron",
      data,
      opts: {
        removeOnComplete: { count: 1 },
        removeOnFail: { age: 86_400 },
        ...options,
      },
    },
  );
}

/**
 * Remove a scheduler – no name constraint needed here.
 */
export async function removeScheduler(
  queue: Queue,
  schedulerId: string,
): Promise<void> {
  await queue.removeJobScheduler(schedulerId);
}
