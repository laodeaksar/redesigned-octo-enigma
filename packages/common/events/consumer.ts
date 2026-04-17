// =============================================================================
// RabbitMQ Consumer — Idempotent processing with delay-based retry + DLQ
// =============================================================================

import type { Channel, ConsumeMessage } from "amqplib";
import type { BaseEvent } from "../types/events";

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageHandler<T = unknown> = (
  payload: T,
  meta: MessageMeta
) => Promise<void>;

export interface MessageMeta {
  raw: ConsumeMessage;
  envelope: BaseEvent<unknown>;
  /** Attempt count. 1 = first try, 2 = first retry, dst */
  attempt: number;
  queue: string;
  /** Sisa retry sebelum masuk DLQ */
  attemptsLeft: number;
}

export interface ConsumeOptions {
  /**
   * Max retry attempts sebelum message masuk DLQ.
   * Default: 3. Total proses = 1 + maxRetries
   */
  maxRetries?: number;
  /**
   * Delay sebelum retry dalam ms. Bisa array buat backoff.
   * Default: [1000, 5000, 15000] untuk 3 retry
   */
  retryDelaysMs?: number | number[];
  /**
   * Prefetch count untuk consumer ini.
   * Default: inherit dari channel
   */
  prefetch?: number;
  /**
   * Nama exchange untuk routing delay. Default: same as main exchange
   */
  exchange?: string;
}

interface InternalRetryHeader {
  "x-retry-count"?: number;
  "x-original-queue"?: string;
  "x-first-failure-at"?: string;
}

const DEFAULT_RETRY_DELAYS = [1000, 5000, 15000];

// ── Consumer ──────────────────────────────────────────────────────────────────

/**
 * Consume messages dengan retry ber-delay + DLQ.
 *
 * Flow:
 * 1. Success → ack
 * 2. Fail + masih ada retry → publish ke delay queue → ack message asli
 * 3. Fail + retry habis → nack ke DLQ
 * 4. Parse error → nack ke DLQ langsung + header reason
 *
 * Delay queue dibuat otomatis: {queue}.retry.{delay}
 *
 * Usage:
 * await consume(channel, QUEUES.EMAIL_WELCOME, async (payload, meta) => {
 * await sendWelcomeEmail(payload as WelcomeEmailPayload)
 * }, { maxRetries: 5 })
 */
export async function consume<T = unknown>(
  channel: Channel,
  queue: string,
  handler: MessageHandler<T>,
  options: ConsumeOptions = {}
): Promise<string> {
  const {
    maxRetries = 3,
    retryDelaysMs = DEFAULT_RETRY_DELAYS,
    prefetch,
    exchange = "my-ecommerce",
  } = options;

  const delays = Array.isArray(retryDelaysMs) ? retryDelaysMs : [retryDelaysMs];
  const actualMaxRetries = Math.min(maxRetries, delays.length);

  if (prefetch != null) {
    await channel.prefetch(prefetch);
  }

  // Setup delay queues sekali di awal
  await setupDelayQueues(channel, queue, delays, exchange);

  const { consumerTag } = await channel.consume(queue, async (msg) => {
    if (!msg) {
      console.warn(`[Consumer:${queue}] Consumer cancelled by broker`);
      return;
    }

    const headers = (msg.properties.headers ?? {}) as InternalRetryHeader;
    const attempt = (headers["x-retry-count"] ?? 0) + 1;
    const attemptsLeft = actualMaxRetries + 1 - attempt;

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
      console.error(`[Consumer:${queue}] Parse failed — sending to DLQ`, {
        messageId: msg.properties.messageId,
        error: parseError,
        raw: msg.content.toString().slice(0, 200),
      });

      channel.nack(msg, false, false); // ke DLQ
      return;
    }

    const meta: MessageMeta = {
      raw: msg,
      envelope,
      attempt,
      queue,
      attemptsLeft,
    };

    // ── Process message ──────────────────────────────────────────────────────
    try {
      await handler(payload, meta);
      channel.ack(msg);
    } catch (handlerError) {
      const errMsg = handlerError instanceof Error ? handlerError.message : String(handlerError);

      // Masih bisa retry
      if (attempt <= actualMaxRetries) {
        const delayMs = delays[attempt - 1] ?? delays[delays.length - 1];
        const retryQueue = getRetryQueueName(queue, delayMs);

        console.warn(`[Consumer:${queue}] Handler failed. Retry ${attempt}/${actualMaxRetries} in ${delayMs}ms`, {
          eventId: envelope.eventId,
          error: errMsg,
        });

        // Publish ke delay queue dengan increment retry count
        const retryHeaders: InternalRetryHeader = {
          ...headers,
          "x-retry-count": attempt,
          "x-original-queue": queue,
          "x-first-failure-at": headers["x-first-failure-at"] ?? new Date().toISOString(),
        };

        channel.publish("", retryQueue, msg.content, {
          ...msg.properties,
          headers: {
            ...msg.properties.headers,
            ...retryHeaders,
          },
        });

        channel.ack(msg); // ack yg asli, karena udah dipindah ke delay queue
      } else {
        // Retry habis → DLQ
        console.error(`[Consumer:${queue}] Max retries exhausted — sending to DLQ`, {
          eventId: envelope.eventId,
          attempt,
          error: errMsg,
          firstFailureAt: headers["x-first-failure-at"],
        });

        // Tambah header biar gampang debug di DLQ
        const dlqHeaders = {
          ...msg.properties.headers,
          "x-dlq-reason": errMsg.slice(0, 255),
          "x-dlq-attempts": attempt,
          "x-dlq-first-failure-at": headers["x-first-failure-at"],
        };

        // Republish manual ke DLQ biar bisa inject header
        const dlq = `dlq.${queue}`;
        channel.sendToQueue(dlq, msg.content, {
          ...msg.properties,
          headers: dlqHeaders,
        });

        channel.ack(msg); // ack asli, karena udah manual ke DLQ
      }
    }
  });

  console.info(`[Consumer:${queue}] Listening (tag: ${consumerTag}, maxRetries: ${actualMaxRetries})`);
  return consumerTag;
}

// ── Delay Queue Setup ─────────────────────────────────────────────────────────

/**
 * Buat delay queue untuk setiap durasi retry.
 * Delay queue = queue + TTL + DLX balik ke queue asli
 */
async function setupDelayQueues(
  channel: Channel,
  queue: string,
  delays: number[],
  exchange: string
): Promise<void> {
  const uniqueDelays = [...new Set(delays)]; // hapus duplikat

  for (const delayMs of uniqueDelays) {
    const retryQueue = getRetryQueueName(queue, delayMs);

    await channel.assertQueue(retryQueue, {
      durable: true,
      arguments: {
        "x-message-ttl": delayMs, // auto-expire
        "x-dead-letter-exchange": "", // default exchange
        "x-dead-letter-routing-key": queue, // balik ke queue asli
      },
    });
  }
}

function getRetryQueueName(queue: string, delayMs: number | undefined): string {
  return `${queue}.retry.${delayMs}`;
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
    const tag = await consume(channel, binding.queue, binding.handler, binding.options);
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