import type { Job, Processor } from "@repo/common/events";

import { logger } from "@/lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

interface JobContext {
  jobId: Job["id"];
  queueName: string;
  attempt: number;
}

interface JobLogMeta extends JobContext {
  durationMs: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildJobContext(job: Job, queueName: string): JobContext {
  return {
    jobId: job.id,
    queueName,
    attempt: job.attemptsMade + 1,
  };
}

function elapsedMs(start: number): number {
  return Date.now() - start;
}

function prefixError(err: unknown, queueName: string): void {
  if (err instanceof Error && !err.message.startsWith(      `[${queueName}]`)) {
    err.message = `[${queueName}] ${err.message}`;
  }
}

// ── withJobLogger ─────────────────────────────────────────────────────────────

/**
 * Wraps a BullMQ processor with structured per-job logging.
 * Used for handlers that are NOT built with createEmailHandler.
 */
export function withJobLogger<T = any>(queueName: string, processor: Processor<T>): Processor<T> {
  return async (job: Job<T>) => {
    const ctx = buildJobContext(job, queueName);
    const jobLogger = logger.child(ctx);
    const start = Date.now();

    jobLogger.info("Processing job");

    try {
      const result = await processor(job);

      const meta: JobLogMeta = { ...ctx, durationMs: elapsedMs(start) };
      jobLogger.info(meta, "Job completed");

      return result;
    } catch (err) {
      const meta: JobLogMeta = { ...ctx, durationMs: elapsedMs(start) };

      prefixError(err, queueName);

      jobLogger.error({ ...meta, err }, "Job failed");

      throw err;
    }
  };
}
