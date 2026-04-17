// =============================================================================
// RabbitMQ Publisher — Type-safe event publishing with confirm + backpressure
// =============================================================================

import { randomUUID } from "node:crypto";
import type { Channel, ConfirmChannel } from "amqplib";
import type { AppEvent, BaseEvent, EventType, ServiceName } from "../types/events";

export interface PublishOptions {
  /** Routing key override — defaults to event.type */
  routingKey?: string;
  /** Message TTL in milliseconds */
  expiration?: number;
  /** Message priority 0–10 */
  priority?: number;
  /** Wait for broker ack. Default: true kalau channel support confirm */
  waitConfirm?: boolean;
  /** Headers untuk tracing, dll */
  headers?: Record<string, unknown>;
}

export interface PublisherConfig {
  exchange: string;
  /** Max retries saat channel error/penuh. 0 = no retry */
  maxRetries?: number;
  /** Base delay ms untuk retry backoff */
  retryDelayMs?: number;
}

const DEFAULT_PUBLISHER_CONFIG: Required<PublisherConfig> = {
  exchange: "my-ecommerce",
  maxRetries: 3,
  retryDelayMs: 500,
};

/**
 * Helper: tunggu drain event kalau channel buffer penuh
 */
function waitForDrain(channel: Channel): Promise<void> {
  //@ts-ignore
  return new Promise((resolve) => channel.once("drain", resolve));
}

/**
 * Helper: exponential backoff sleep
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Publish a typed event to the RabbitMQ topic exchange.
 * Otomatis retry kalau channel penuh/error + support confirm channel.
 *
 * Usage:
 *   await publish(channel, { type: "order.paid", source: "payment-service", payload: {...} })
 */
export async function publish<T extends AppEvent>(
  channel: Channel | ConfirmChannel,
  event: Omit<T, "eventId" | "occurredAt"> & { type: EventType; source: ServiceName },
  options: PublishOptions = {},
  config: Partial<PublisherConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_PUBLISHER_CONFIG, ...config };
  const { maxRetries, retryDelayMs, exchange } = cfg;

  const fullEvent: BaseEvent = {
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    ...event,
  };

  const routingKey = options.routingKey ?? event.type;
  //@ts-ignore
  const content = Buffer.from(JSON.stringify(fullEvent));

  const msgOptions = {
    persistent: true,
    contentType: "application/json",
    contentEncoding: "utf-8" as const,
    timestamp: Date.now(),
    messageId: fullEvent.eventId,
    appId: event.source,
    headers: options.headers,
    ...(options.expiration ? { expiration: String(options.expiration) } : {}),
    ...(options.priority != null ? { priority: options.priority } : {}),
  };

  let attempt = 0;

  while (true) {
    try {
      // Kalau channel sudah ditutup oleh connection factory, langsung throw
      // @ts-expect-error - cek internal state
      if (channel.connection?.stream?.destroyed) {
        throw new Error("Channel is closed");
      }

      const sent = channel.publish(exchange, routingKey, content, msgOptions);

      // Handle backpressure: kalau false, tunggu drain
      if (!sent) {
        await waitForDrain(channel);
      }

      // Kalau confirm channel + waitConfirm, tunggu ack dari broker
      if (options.waitConfirm !== false && "waitForConfirms" in channel) {
        await channel.waitForConfirms();
      }

      return; // sukses
    } catch (err) {
      if (attempt >= maxRetries) {
        throw new Error(
          `[RabbitMQ] Publish failed after ${attempt + 1} attempts: ${(err as Error).message}`,
          //@ts-ignore
          { cause: err }
        );
      }

      attempt++;
      const delay = Math.min(retryDelayMs * 2 ** (attempt - 1), 10000);
      const jitter = Math.random() * 200;
      console.warn(
        `[RabbitMQ] Publish to ${routingKey} failed. Retry ${attempt}/${maxRetries} in ${delay}ms`,
        err
      );
      await sleep(delay + jitter);
    }
  }
}

/**
 * Publish directly to a named queue (bypasses exchange routing).
 * Useful for sending job-like messages (e.g. email tasks).
 *
 * Usage:
 *   await publishToQueue(channel, QUEUES.EMAIL_WELCOME, payload)
 */
export async function publishToQueue<T = unknown>(
  channel: Channel | ConfirmChannel,
  queue: string,
  payload: T,
  options: PublishOptions = {},
  config: Partial<PublisherConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_PUBLISHER_CONFIG, ...config };
  const { maxRetries, retryDelayMs } = cfg;

  const message = {
    messageId: randomUUID(),
    sentAt: new Date().toISOString(),
    payload,
  };

  //@ts-ignore
  const content = Buffer.from(JSON.stringify(message));

  const msgOptions = {
    persistent: true,
    contentType: "application/json",
    contentEncoding: "utf-8" as const,
    timestamp: Date.now(),
    messageId: message.messageId,
    headers: options.headers,
    ...(options.expiration ? { expiration: String(options.expiration) } : {}),
  };

  let attempt = 0;

  while (true) {
    try {
      // @ts-expect-error
      if (channel.connection?.stream?.destroyed) {
        throw new Error("Channel is closed");
      }

      const sent = channel.sendToQueue(queue, content, msgOptions);

      if (!sent) {
        await waitForDrain(channel);
      }

      if (options.waitConfirm !== false && "waitForConfirms" in channel) {
        await channel.waitForConfirms();
      }

      return;
    } catch (err) {
      if (attempt >= maxRetries) {
        throw new Error(
          `[RabbitMQ] sendToQueue ${queue} failed after ${attempt + 1} attempts: ${(err as Error).message}`,
          //@ts-ignore
          { cause: err }
        );
      }

      attempt++;
      const delay = Math.min(retryDelayMs * 2 ** (attempt - 1), 10000);
      const jitter = Math.random() * 200;
      console.warn(
        `[RabbitMQ] sendToQueue ${queue} failed. Retry ${attempt}/${maxRetries} in ${delay}ms`,
        err
      );
      await sleep(delay + jitter);
    }
  }
}

// ── Publisher factory ─────────────────────────────────────────────────────────

/**
 * Creates a publisher bound to a specific service name.
 * Cleaner API + inject config sekali di awal.
 *
 * Usage:
 *   const publisher = createPublisher(channel, "order-service", { exchange: "my-ecommerce" })
 *   await publisher.emit("order.cancelled", { orderId, ... })
 */
export function createPublisher(
  channel: Channel | ConfirmChannel,
  source: ServiceName,
  config: Partial<PublisherConfig> = {}
) {
  return {
    emit<T extends AppEvent>(
      type: T["type"],
      payload: T["payload"],
      options?: PublishOptions
    ): Promise<void> {
      return publish(
        channel,
        { type, source, payload } as Omit<T, "eventId" | "occurredAt"> & {
          type: EventType;
          source: ServiceName;
        },
        options,
        config
      );
    },

    toQueue<T = unknown>(
      queue: string,
      payload: T,
      options?: PublishOptions
    ): Promise<void> {
      return publishToQueue(channel, queue, payload, options, config);
    },
  };
}

export type Publisher = ReturnType<typeof createPublisher>;