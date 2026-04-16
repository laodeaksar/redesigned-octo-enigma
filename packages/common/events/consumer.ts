// =============================================================================
// RabbitMQ Consumer — Idempotent message processing with retry + DLQ
// =============================================================================

import type { Channel, ConsumeMessage } from "amqplib";

import type { BaseEvent } from "../types/events";

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageHandler<T = unknown> = (
  payload: T,
  meta: MessageMeta
) => Promise<void>;

export interface MessageMeta {
  /** Raw message — use for manual ack/nack if needed */
  raw: ConsumeMessage;
  /** Full envelope including eventId, occurredAt, source */
  envelope: BaseEvent<unknown>;
  /** Number of times this message has been delivered (1 = first delivery) */
  deliveryCount: number;
  /** Queue this message was consumed from */
  queue: string;
}

export interface ConsumeOptions {
  /**
   * Max retry attempts before the message is sent to the DLQ.
   * Default: 3
   */
  maxRetries?: number;
  /**
   * Whether to requeue the message on failure (false = send to DLQ).
   * Default: false — always prefer DLQ over infinite requeue loops
   */
  requeue?: boolean;
  /**
   * Prefetch count for this consumer.
   * Default: inherits the channel-level prefetch set in connection.ts
   */
  prefetch?: number;
}

// ── Consumer ──────────────────────────────────────────────────────────────────

/**
 * Consume messages from a queue with automatic ack/nack handling.
 *
 * - On success      → ack
 * - On failure      → nack + optionally requeue (up to maxRetries)
 * - On max retries  → nack without requeue → message goes to DLQ
 *
 * Usage:
 *   await consume(channel, QUEUES.EMAIL_WELCOME, async (payload, meta) => {
 *     await sendWelcomeEmail(payload as WelcomeEmailPayload)
 *   })
 */
export async function consume<T = unknown>(
  channel: Channel,
  queue: string,
  handler: MessageHandler<T>,
  options: ConsumeOptions = {}
): Promise<string> {
  const { maxRetries = 3, requeue = false, prefetch } = options;

  if (prefetch != null) {
    await channel.prefetch(prefetch);
  }

  const { consumerTag } = await channel.consume(queue, async (msg) => {
    if (!msg) {
      // null message = consumer cancelled by broker
      console.warn(`[Consumer:${queue}] Consumer cancelled by broker`);
      return;
    }

    const deliveryCount = getDeliveryCount(msg);
    let envelope: BaseEvent<unknown>;
    let payload: T;

    // ── Parse message ────────────────────────────────────────────────────────
    try {
      const raw = JSON.parse(msg.content.toString()) as BaseEvent<T> & {
        payload: T;
      };

      // Handle both direct queue messages and event envelope format
      if ("eventId" in raw && "payload" in raw) {
        envelope = raw as BaseEvent<unknown>;
        payload = raw.payload;
      } else {
        // Direct queue message (publishToQueue format)
        const wrapper = raw as unknown as {
          messageId: string;
          sentAt: string;
          payload: T;
        };
        envelope = {
          eventId: wrapper.messageId ?? msg.properties.messageId ?? "unknown",
          occurredAt: wrapper.sentAt ?? new Date().toISOString(),
          source: (msg.properties.appId as never) ?? "unknown",
          type: queue as never,
          payload: wrapper.payload,
        };
        payload = wrapper.payload;
      }
    } catch (parseError) {
      // Unparseable message — send straight to DLQ, do not retry
      console.error(`[Consumer:${queue}] Failed to parse message — sending to DLQ`, {
        messageId: msg.properties.messageId,
        error: parseError,
        raw: msg.content.toString().slice(0, 200),
      });
      channel.nack(msg, false, false);
      return;
    }

    // ── Process message ──────────────────────────────────────────────────────
    try {
      await handler(payload, {
        raw: msg,
        envelope,
        deliveryCount,
        queue,
      });

      channel.ack(msg);
    } catch (handlerError) {
      const shouldRetry = requeue && deliveryCount <= maxRetries;

      console.error(`[Consumer:${queue}] Handler failed`, {
        eventId: envelope.eventId,
        deliveryCount,
        maxRetries,
        willRetry: shouldRetry,
        error:
          handlerError instanceof Error
            ? handlerError.message
            : handlerError,
      });

      if (shouldRetry) {
        // Requeue — message will be re-delivered
        channel.nack(msg, false, true);
      } else {
        // Exhausted retries — send to DLQ
        channel.nack(msg, false, false);
      }
    }
  });

  console.info(`[Consumer:${queue}] Listening (tag: ${consumerTag})`);
  return consumerTag;
}

// ── Multi-queue consumer ──────────────────────────────────────────────────────

export interface QueueBinding<T = unknown> {
  queue: string;
  handler: MessageHandler<T>;
  options?: ConsumeOptions;
}

/**
 * Register handlers for multiple queues in one call.
 * Useful in email-worker or any service consuming several queues.
 *
 * Usage:
 *   await consumeMany(channel, [
 *     { queue: QUEUES.EMAIL_WELCOME, handler: handleWelcomeEmail },
 *     { queue: QUEUES.EMAIL_ORDER_CONFIRMATION, handler: handleOrderConfirmation },
 *   ])
 */
export async function consumeMany(
  channel: Channel,
  bindings: QueueBinding[]
): Promise<string[]> {
  const tags: string[] = [];

  for (const binding of bindings) {
    const tag = await consume(
      channel,
      binding.queue,
      binding.handler,
      binding.options
    );
    tags.push(tag);
  }

  return tags;
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────

/**
 * Cancel all consumers gracefully — waits for in-flight messages to finish.
 */
export async function cancelConsumers(
  channel: Channel,
  consumerTags: string[]
): Promise<void> {
  await Promise.all(consumerTags.map((tag) => channel.cancel(tag)));
  console.info("[Consumer] All consumers cancelled.");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * RabbitMQ doesn't expose a built-in delivery count header.
 * This reads the x-death header set by DLX routing.
 */
function getDeliveryCount(msg: ConsumeMessage): number {
  const deaths = msg.properties.headers?.["x-death"] as
    | Array<{ count: number }>
    | undefined;

  if (!deaths || deaths.length === 0) return 1;
  return (deaths[0]?.count ?? 0) + 1;
}
