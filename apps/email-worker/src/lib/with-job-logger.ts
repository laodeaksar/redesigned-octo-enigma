import type { Job, Processor } from "@repo/common/events";
import { logger } from "@/lib/logger";

/**
 * Wraps a BullMQ processor with structured per-job logging.
 * Used for handlers that are NOT built with createEmailHandler.
 */
export function withJobLogger(
  queueName: string,
  processor: Processor
): Processor {
  return async (job: Job) => {
    const jobLogger = logger.child({
      jobId: job.id,
      queueName,
      attempt: job.attemptsMade + 1,
    });

    jobLogger.info("Processing job");
    const start = Date.now();

    try {
      const result = await processor(job);
      jobLogger.info({ duration: Date.now() - start }, "Job completed");
      return result;
    } catch (err) {
      jobLogger.error({ err, duration: Date.now() - start }, "Job failed");
      throw err;
    }
  };
}
