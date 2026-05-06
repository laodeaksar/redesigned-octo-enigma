// =============================================================================
// product-service BullMQ workers — stubs when Redis is unavailable
// =============================================================================

export type Worker = { close: (force?: boolean) => Promise<void> };

export function startWorkers(): Worker[] {
  console.info("⚠ BullMQ workers disabled (Redis unavailable)");
  return [];
}

export async function closeWorkers(_workers: Worker[]): Promise<void> {}
