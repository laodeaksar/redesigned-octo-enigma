// =============================================================================
// @my-ecommerce/common/metrics — barrel export
// Import from: "@my-ecommerce/common/metrics"
// =============================================================================

export {
  createRegistry,
  getMetricsOutput,
  CONTENT_TYPE,
  Gauge, Counter, Histogram, Summary,
} from "./registry";
export type { Registry, CreateRegistryOptions } from "./registry";

export {
  createHttpMetrics,
  elysiaMetricsMiddleware,
  honoMetricsMiddleware,
} from "./http-metrics";
export type { HttpMetrics } from "./http-metrics";

export {
  createQueueMetrics,
  startQueueCollector,
  instrumentWorker,
} from "./queue-metrics";
export type { QueueMetrics } from "./queue-metrics";

