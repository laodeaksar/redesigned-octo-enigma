// =============================================================================
// packages/common/events — BullMQ barrel export
// Import from: "@repo/common/events"
//
// Migration from RabbitMQ:
//   createPublisher()   → createQueue() + addJob()
//   consumeMany()       → createWorkers()
//   QUEUES              → QUEUES  (unchanged — no breaking change)
// =============================================================================

// ── Queue names ───────────────────────────────────────────────────────────────
export { QUEUES } from "./queue-names";
export type { QueueName } from "./queue-names";

// ── Producer ──────────────────────────────────────────────────────────────────
export {
  createQueue,
  addJob,
  addUniqueJob,
  addDelayedJob,
  closeQueues,
  DEFAULT_JOB_OPTIONS,
  IMPORTANT_JOB_OPTIONS,
} from "./producer";

// ── Worker ────────────────────────────────────────────────────────────────────
export {
  createWorker,
  createWorkers,
  closeWorkers,
} from "./worker";

export type { Processor, Job, WorkerBinding, CreateWorkerOptions } from "./worker";

// ── Scheduler ─────────────────────────────────────────────────────────────────
export {
  scheduleRecurring,
  scheduleCron,
  removeScheduler,
} from "./scheduler";

// ── Re-export BullMQ core types ───────────────────────────────────────────────
export type { Queue, Worker, JobsOptions } from "bullmq";

