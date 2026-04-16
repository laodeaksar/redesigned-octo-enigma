// =============================================================================
// RabbitMQ Connection Factory
// Singleton connection + channel with automatic reconnect on failure
// =============================================================================

import type { Connection, Channel, Options } from "amqplib";

export interface RabbitMQConfig {
  url: string;
  /** Heartbeat in seconds (default: 60) */
  heartbeat?: number;
  /** Max reconnect attempts — 0 = infinite (default: 0) */
  maxRetries?: number;
  /** Base delay between reconnect attempts in ms (default: 2000) */
  retryDelay?: number;
}

export interface RabbitMQConnection {
  connection: Connection;
  channel: Channel;
  close: () => Promise<void>;
}

let instance: RabbitMQConnection | null = null;
let isConnecting = false;
let retryCount = 0;

/**
 * Returns a singleton RabbitMQ connection + channel.
 * Automatically reconnects on connection errors.
 *
 * Usage:
 *   const { channel } = await getRabbitMQConnection({ url: env.RABBITMQ_URL })
 */
export async function getRabbitMQConnection(
  config: RabbitMQConfig
): Promise<RabbitMQConnection> {
  if (instance) return instance;
  if (isConnecting) {
    // Wait for the in-flight connection attempt
    await new Promise<void>((resolve) => {
      const poll = setInterval(() => {
        if (!isConnecting) {
          clearInterval(poll);
          resolve();
        }
      }, 100);
    });
    if (instance) return instance;
  }

  isConnecting = true;

  const {
    url,
    heartbeat = 60,
    maxRetries = 0,
    retryDelay = 2000,
  } = config;

  // Dynamic import so services that don't use RabbitMQ don't pay the cost
  const amqp = await import("amqplib");

  async function connect(): Promise<RabbitMQConnection> {
    const connectOptions: Options.Connect = { heartbeat };

    const connection = await amqp.connect(url, connectOptions);
    const channel = await connection.createChannel();

    // Prefetch = 1 by default — prevent overwhelming a single worker
    await channel.prefetch(1);

    const close = async () => {
      try {
        await channel.close();
        await connection.close();
      } catch {
        // Ignore close errors
      } finally {
        instance = null;
      }
    };

    // ── Reconnect logic ────────────────────────────────────────────────────────
    connection.on("error", (err) => {
      console.error("[RabbitMQ] Connection error:", err.message);
      instance = null;
    });

    connection.on("close", () => {
      console.warn("[RabbitMQ] Connection closed — scheduling reconnect…");
      instance = null;

      const canRetry = maxRetries === 0 || retryCount < maxRetries;
      if (!canRetry) {
        console.error("[RabbitMQ] Max retries reached — giving up.");
        return;
      }

      retryCount++;
      const delay = retryDelay * Math.min(retryCount, 5); // cap backoff at 5×

      setTimeout(() => {
        console.info(`[RabbitMQ] Reconnecting (attempt ${retryCount})…`);
        void connect().then((conn) => {
          instance = conn;
          retryCount = 0;
          console.info("[RabbitMQ] Reconnected successfully.");
        });
      }, delay);
    });

    return { connection, channel, close };
  }

  try {
    instance = await connect();
    retryCount = 0;
    return instance;
  } finally {
    isConnecting = false;
  }
}

/**
 * Assert exchanges and queues needed for the application.
 * Call once at service startup before publishing/consuming.
 */
export async function setupRabbitMQTopology(
  channel: Channel,
  queues: string[]
): Promise<void> {
  const EXCHANGE = "my-ecommerce";

  // Topic exchange — routing key = event type (e.g. "order.paid")
  await channel.assertExchange(EXCHANGE, "topic", { durable: true });

  for (const queue of queues) {
    // Main queue
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        // Dead-letter exchange for failed messages
        "x-dead-letter-exchange": `${EXCHANGE}.dlx`,
        "x-dead-letter-routing-key": `dlq.${queue}`,
      },
    });

    // Bind queue to exchange using queue name as routing key
    await channel.bindQueue(queue, EXCHANGE, queue);
  }

  // ── Dead-Letter Exchange & Queues ──────────────────────────────────────────
  await channel.assertExchange(`${EXCHANGE}.dlx`, "direct", { durable: true });

  for (const queue of queues) {
    const dlqName = `dlq.${queue}`;
    await channel.assertQueue(dlqName, { durable: true });
    await channel.bindQueue(dlqName, `${EXCHANGE}.dlx`, dlqName);
  }
}
