// =============================================================================
// order-service BullMQ workers (disabled — Redis not available in this env)
// =============================================================================

import type { Worker } from "bullmq";

export function startWorkers(): Worker[] {
  console.warn("[BullMQ] Workers disabled — Redis not available in this environment");
  return [];
}
