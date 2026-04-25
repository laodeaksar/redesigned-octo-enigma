// =============================================================================
// BullMQ queue metrics — depth, job counts, worker status
// =============================================================================

import { Gauge, Counter, type Registry } from "prom-client";
import type { Queue, Worker } from "bullmq";

// ── Metric definitions ────────────────────────────────────────────────────────

export interface QueueMetrics {
  queueDepth:     Gauge;
  jobsCompleted:  Counter;
  jobsFailed:     Counter;
  jobsDelayed:    Counter;
  processingTime: import("prom-client").Histogram;
  workersActive:  Gauge;
}

export function createQueueMetrics(registry: Registry): QueueMetrics {
  const queueDepth = new Gauge({
    name:       "bullmq_queue_depth",
    help:       "Number of jobs waiting in BullMQ queue",
    labelNames: ["queue", "state"],
    registers:  [registry],
  });

  const jobsCompleted = new Counter({
    name:       "bullmq_jobs_completed_total",
    help:       "Total number of completed BullMQ jobs",
    labelNames: ["queue"],
    registers:  [registry],
  });

  const jobsFailed = new Counter({
    name:       "bullmq_jobs_failed_total",
    help:       "Total number of failed BullMQ jobs",
    labelNames: ["queue"],
    registers:  [registry],
  });

  const jobsDelayed = new Counter({
    name:       "bullmq_jobs_delayed_total",
    help:       "Total number of delayed BullMQ jobs",
    labelNames: ["queue"],
    registers:  [registry],
  });

  const { Histogram } = require("prom-client") as { Histogram: typeof import("prom-client").Histogram };
  const processingTime = new Histogram({
    name:       "bullmq_job_duration_seconds",
    help:       "BullMQ job processing time in seconds",
    labelNames: ["queue"],
    buckets:    [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    registers:  [registry],
  });

  const workersActive = new Gauge({
    name:       "bullmq_workers_active",
    help:       "Number of active BullMQ worker instances",
    labelNames: ["queue"],
    registers:  [registry],
  });

  return { queueDepth, jobsCompleted, jobsFailed, jobsDelayed, processingTime, workersActive };
}

// ── Collector ─────────────────────────────────────────────────────────────────

/**
 * Start periodic collection of queue depth metrics.
 * Call once after queues are initialized.
 *
 * @param queues   Map of queue name → Queue instance
 * @param metrics  QueueMetrics from createQueueMetrics()
 * @param interval Collection interval ms (default 15s)
 */
export function startQueueCollector(
  queues: Record<string, Queue>,
  metrics: QueueMetrics,
  interval = 15_000
): NodeJS.Timeout {
  const collect = async () => {
    await Promise.allSettled(
      Object.entries(queues).map(async ([name, queue]) => {
        const counts = await queue.getJobCounts(
          "waiting", "active", "delayed", "failed", "completed", "paused"
        );

        metrics.queueDepth.set({ queue: name, state: "waiting"   }, counts.waiting   ?? 0);
        metrics.queueDepth.set({ queue: name, state: "active"    }, counts.active     ?? 0);
        metrics.queueDepth.set({ queue: name, state: "delayed"   }, counts.delayed    ?? 0);
        metrics.queueDepth.set({ queue: name, state: "failed"    }, counts.failed     ?? 0);
        metrics.queueDepth.set({ queue: name, state: "completed" }, counts.completed  ?? 0);
      })
    );
  };

  // Collect immediately, then on interval
  void collect();
  return setInterval(() => void collect(), interval);
}

// ── Worker event hooks ────────────────────────────────────────────────────────

/**
 * Attach Prometheus counters to a BullMQ Worker's events.
 * Call this for every worker instance.
 */
export function instrumentWorker(
  worker: Worker,
  queueName: string,
  metrics: QueueMetrics
): void {
  metrics.workersActive.inc({ queue: queueName });

  worker.on("completed", (job) => {
    metrics.jobsCompleted.inc({ queue: queueName });
    if (job.processedOn && job.timestamp) {
      const durationSec = (job.processedOn - job.timestamp) / 1000;
      metrics.processingTime.observe({ queue: queueName }, durationSec);
    }
  });

  worker.on("failed", () => {
    metrics.jobsFailed.inc({ queue: queueName });
  });

  worker.on("error", () => {
    metrics.jobsFailed.inc({ queue: queueName });
  });

  worker.on("closed", () => {
    metrics.workersActive.dec({ queue: queueName });
  });
}

