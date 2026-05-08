// =============================================================================
// Prometheus Registry
// Each service creates ONE registry. Default system metrics (CPU, memory,
// event loop lag, GC) are collected automatically.
// =============================================================================

import {
  Counter,
  collectDefaultMetrics,
  Gauge,
  Histogram,
  Registry,
  Summary,
} from "prom-client";

export type { Registry };
// Re-export prom-client primitives for convenience
export { Counter, Gauge, Histogram, Summary };

// ── Factory ───────────────────────────────────────────────────────────────────

export interface CreateRegistryOptions {
  /** Collect Node.js default metrics (CPU, memory, GC). Default: true */
  collectDefaults?: boolean;
  /** Default metrics collection interval ms. Default: 10000 */
  defaultMetricsInterval?: number;
  /** Environment label e.g. "production" */
  env?: string;
  /** Service name label added to every metric e.g. "api-gateway" */
  serviceName: string;
}

/**
 * Create a Prometheus Registry pre-loaded with:
 *   - Default Node.js / process metrics
 *   - `service` and `env` labels on every metric via globalLabels
 */
export function createRegistry(opts: CreateRegistryOptions): Registry {
  const {
    serviceName,
    env = process.env["NODE_ENV"] ?? "development",
    collectDefaults = true,
    defaultMetricsInterval = 10_000,
  } = opts;

  const registry = new Registry();

  // Attach default labels to every metric in this registry
  registry.setDefaultLabels({ service: serviceName, env });

  if (collectDefaults) {
    collectDefaultMetrics({
      register: registry,
      prefix: "nodejs_",
      labels: { service: serviceName, env },
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });
  }

  return registry;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Render the registry as a plain-text Prometheus exposition.
 * Mount this on GET /metrics in each service.
 */
export async function getMetricsOutput(registry: Registry): Promise<string> {
  return registry.metrics();
}

export const CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8";
