//import { Job } from "bullmq";
import { logger } from "./logger";
import type { Job, Processor } from "@repo/common/events"; // atau dari bullmq, sesuaikan

/**
 * Membungkus processor asli dengan logging terstruktur per job.
 * Tipe tetap aman karena input dan output sama-sama Processor.
 */
export function withJobLogger(queueName: string, processor: Processor): Processor {
  return async (job: Job) => {
    const jobLogger = logger.child({
      jobId: job.id,
      queueName,
      attempt: job.attemptsMade + 1,
    });

    jobLogger.info("Processing job");
    const start = Date.now();

    try {
      await processor(job);
      jobLogger.info({ duration: Date.now() - start }, "Job completed");
    } catch (err) {
      jobLogger.error({ err, duration: Date.now() - start }, "Job failed");
      throw err; // biar BullMQ yang handle retry
    }
  };
}