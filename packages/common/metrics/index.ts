// =============================================================================
// @repo/common/metrics — barrel export
// Import from: "@repo/common/metrics"
// =============================================================================

export type { HttpMetrics } from "./http-metrics";
export {
  createHttpMetrics,
  elysiaMetricsMiddleware,
  honoMetricsMiddleware,
} from "./http-metrics";
export type { QueueMetrics } from "./queue-metrics";
export {
  createQueueMetrics,
  instrumentWorker,
  startQueueCollector,
} from "./queue-metrics";
export type { CreateRegistryOptions, Registry } from "./registry";
export {
  CONTENT_TYPE,
  Counter,
  createRegistry,
  Gauge,
  getMetricsOutput,
  Histogram,
  Summary,
} from "./registry";
