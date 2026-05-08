// =============================================================================
// packages/common/events — BullMQ barrel export
// Import from: "@repo/common/events"
//
// Migration from RabbitMQ:
//   createPublisher()   → createQueue() + addJob()
//   consumeMany()       → createWorkers()
//   QUEUES              → QUEUES  (unchanged — no breaking change)
// =============================================================================

// ── Re-export BullMQ core types ───────────────────────────────────────────────
export type { JobsOptions, Queue, Worker } from "bullmq";
// ── Producer ──────────────────────────────────────────────────────────────────
export {
  addDelayedJob,
  addJob,
  addUniqueJob,
  closeQueues,
  createQueue,
  DEFAULT_JOB_OPTIONS,
  IMPORTANT_JOB_OPTIONS,
} from "./producer";
export type { QueueName } from "./queue-names";
// ── Queue names ───────────────────────────────────────────────────────────────
export { QUEUES } from "./queue-names";
// ── Scheduler ─────────────────────────────────────────────────────────────────
export {
  removeScheduler,
  scheduleCron,
  scheduleRecurring,
} from "./scheduler";
export type {
  CreateWorkerOptions,
  Job,
  Processor,
  WorkerBinding,
} from "./worker";
// ── Worker ────────────────────────────────────────────────────────────────────
export {
  closeWorkers,
  createWorker,
  createWorkers,
} from "./worker";
