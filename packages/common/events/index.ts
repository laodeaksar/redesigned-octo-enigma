// =============================================================================
// packages/common/events — barrel export
// Import from: "@repo/common/events"
// =============================================================================

// ── Connection ────────────────────────────────────────────────────────────────
export {
    getRabbitMQConnection,
    setupRabbitMQTopology,
  } from "./connection";
  
  export type { RabbitMQConfig, RabbitMQConnection } from "./connection";
  
  // ── Publisher ─────────────────────────────────────────────────────────────────
  export {
    publish,
    publishToQueue,
    createPublisher,
  } from "./publisher";
  
  export type { Publisher, PublishOptions } from "./publisher";
  
  // ── Consumer ──────────────────────────────────────────────────────────────────
  export {
    consume,
    consumeMany,
    cancelConsumers,
  } from "./consumer";
  
  export type {
    MessageHandler,
    MessageMeta,
    ConsumeOptions,
    QueueBinding,
  } from "./consumer";
  
  // ── Re-export event contracts from types (convenience) ────────────────────────
  export { QUEUES } from "../types/events";
  export type {
    AppEvent,
    BaseEvent,
    EventType,
    QueueName,
    ServiceName,
  } from "../types/events";
  