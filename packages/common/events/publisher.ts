// =============================================================================
// RabbitMQ Publisher — Type-safe event publishing
// =============================================================================

import { randomUUID } from "node:crypto";

import type { Channel } from "amqplib";

import type { AppEvent, BaseEvent, EventType, ServiceName } from "../types/events";

export interface PublishOptions {
  /** Routing key override — defaults to event.type */
  routingKey?: string;
  /** Message TTL in milliseconds */
  expiration?: number;
  /** Message priority (0–10) */
  priority?: number;
}

const EXCHANGE = "my-ecommerce";

/**
 * Publish a typed event to the RabbitMQ topic exchange.
 *
 * Usage:
 *   await publish(channel, {
 *     type: "order.paid",
 *     source: "payment-service",
 *     payload: { orderId, ... }
 *   })
 */
export async function publish<T extends AppEvent>(
  channel: Channel,
  event: Omit<T, "eventId" | "occurredAt"> & { type: EventType; source: ServiceName },
  options: PublishOptions = {}
): Promise<boolean> {
  const fullEvent: BaseEvent = {
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    ...event,
  };

  const routingKey = options.routingKey ?? event.type;
  const content = Buffer.from(JSON.stringify(fullEvent));

  return channel.publish(EXCHANGE, routingKey, content, {
    persistent: true,             // survive broker restart
    contentType: "application/json",
    contentEncoding: "utf-8",
    timestamp: Date.now(),
    messageId: fullEvent.eventId,
    appId: event.source,
    ...(options.expiration ? { expiration: String(options.expiration) } : {}),
    ...(options.priority != null ? { priority: options.priority } : {}),
  });
}

/**
 * Publish directly to a named queue (bypasses exchange routing).
 * Useful for sending job-like messages (e.g. email tasks).
 *
 * Usage:
 *   await publishToQueue(channel, QUEUES.EMAIL_WELCOME, payload)
 */
export async function publishToQueue<T = unknown>(
  channel: Channel,
  queue: string,
  payload: T,
  options: PublishOptions = {}
): Promise<boolean> {
  const message = {
    messageId: randomUUID(),
    sentAt: new Date().toISOString(),
    payload,
  };

  const content = Buffer.from(JSON.stringify(message));

  return channel.sendToQueue(queue, content, {
    persistent: true,
    contentType: "application/json",
    contentEncoding: "utf-8",
    timestamp: Date.now(),
    messageId: message.messageId,
    ...(options.expiration ? { expiration: String(options.expiration) } : {}),
  });
}

// ── Publisher factory ─────────────────────────────────────────────────────────

/**
 * Creates a publisher bound to a specific service name.
 * Cleaner API when a single service publishes many events.
 *
 * Usage:
 *   const publisher = createPublisher(channel, "order-service")
 *   await publisher.emit("order.cancelled", { orderId, ... })
 */
export function createPublisher(channel: Channel, source: ServiceName) {
  return {
    emit<T extends AppEvent>(
      type: T["type"],
      payload: T["payload"],
      options?: PublishOptions
    ) {
      return publish(
        channel,
        { type, source, payload } as Omit<T, "eventId" | "occurredAt"> & {
          type: EventType;
          source: ServiceName;
        },
        options
      );
    },

    toQueue<T = unknown>(queue: string, payload: T, options?: PublishOptions) {
      return publishToQueue(channel, queue, payload, options);
    },
  };
}

export type Publisher = ReturnType<typeof createPublisher>;
