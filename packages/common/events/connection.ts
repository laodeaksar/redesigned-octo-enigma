// =============================================================================
// RabbitMQ Connection Factory
// Singleton connection + channel with automatic reconnect on failure
// =============================================================================

import type { Channel, ChannelModel, Options } from "amqplib";

export interface RabbitMQConfig {
  url: string;
  /** Heartbeat in seconds (default: 60) */
  heartbeat?: number;
  /** Max reconnect attempts — 0 = infinite (default: 0) */
  maxRetries?: number;
  /** Base delay between reconnect attempts in ms (default: 2000) */
  retryDelay?: number;
  /** Prefetch count per consumer (default: 1) */
  prefetch?: number;
}

export interface RabbitMQConnection {
  connection: ChannelModel;
  channel: Channel;
  close: () => Promise<void>;
  isHealthy: () => boolean;
}

let instance: RabbitMQConnection | null = null;
let connectingPromise: Promise<RabbitMQConnection> | null = null;
let retryCount = 0;

/**
 * Returns a singleton RabbitMQ connection + channel.
 * Automatically reconnects on connection/channel errors.
 *
 * Usage:
 * const { channel } = await getRabbitMQConnection({ url: env.RABBITMQ_URL })
 */
export async function getRabbitMQConnection(
  config: RabbitMQConfig
): Promise<RabbitMQConnection> {
  if (instance?.isHealthy()) return instance;

  // Kalau sudah ada yg connect, return promise yang sama ke semua caller
  if (connectingPromise) return connectingPromise;

  const {
    url,
    heartbeat = 60,
    maxRetries = 0,
    retryDelay = 2000,
    prefetch = 1,
  } = config;

  // Dynamic import so services that don't use RabbitMQ don't pay the cost
  const amqp = await import("amqplib");

  const createConnection = async (): Promise<RabbitMQConnection> => {
    const connectOptions: Options.Connect = { heartbeat };

    const connection = await amqp.connect(url, connectOptions);
    const channel = await connection.createChannel();

    await channel.prefetch(prefetch);

    const isHealthy = () => {
      // @ts-expect-error - accessing internal state for health check
      return !connection.connection.stream.destroyed && !channel.connection.stream.destroyed;
    };

    const close = async () => {
      connectingPromise = null;
      instance = null;
      try {
        if (isHealthy()) {
          await channel.close();
          await connection.close();
        }
      } catch (err) {
        console.error("[RabbitMQ] Error during close:", err);
      }
    };

    // ── Error & Reconnect handlers ──────────────────────────────────────────
    const scheduleReconnect = (reason: string) => {
      console.warn(`[RabbitMQ] ${reason} — scheduling reconnect…`);
      instance = null;
      connectingPromise = null;

      const canRetry = maxRetries === 0 || retryCount < maxRetries;
      if (!canRetry) {
        console.error("[RabbitMQ] Max retries reached — giving up.");
        return;
      }

      retryCount++;
      // Exponential backoff with jitter: 2s, 4s, 8s, 16s... max 30s
      const delay = Math.min(retryDelay * 2 ** (retryCount - 1), 30000);
      const jitter = Math.random() * 1000;

      setTimeout(() => {
        console.info(`[RabbitMQ] Reconnecting (attempt ${retryCount})…`);
        connectingPromise = createConnection();
        connectingPromise
          .then((conn) => {
            instance = conn;
            retryCount = 0;
            console.info("[RabbitMQ] Reconnected successfully.");
          })
          .catch((err) => {
            console.error("[RabbitMQ] Reconnect failed:", err);
            connectingPromise = null;
          });
      }, delay + jitter);
    };

    connection.on("error", (err) => {
      console.error("[RabbitMQ] Connection error:", err.message);
      scheduleReconnect("Connection error");
    });

    connection.on("close", () => scheduleReconnect("Connection closed"));

    connection.on("blocked", (reason) =>
      console.warn("[RabbitMQ] Connection blocked:", reason)
    );
    connection.on("unblocked", () => console.info("[RabbitMQ] Connection unblocked"));

    channel.on("error", (err) => {
      console.error("[RabbitMQ] Channel error:", err.message);
      scheduleReconnect("Channel error");
    });

    channel.on("close", () => scheduleReconnect("Channel closed"));

    return { connection, channel, close, isHealthy };
  };

  try {
    connectingPromise = createConnection();
    instance = await connectingPromise;
    retryCount = 0;
    return instance;
  } catch (err) {
    connectingPromise = null;
    throw err;
  }
}

/**
 * Assert exchanges and queues needed for the application.
 * Call once at service startup before publishing/consuming.
 * Idempotent — safe to call multiple times.
 */
export async function setupRabbitMQTopology(
  channel: Channel,
  queues: string[],
  exchangeName = "my-ecommerce"
): Promise<void> {
  const EXCHANGE = exchangeName;
  const DLX = `${EXCHANGE}.dlx`;

  // ── Dead-Letter Exchange & Queues dulu biar bisa di-reference ─────────────
  await channel.assertExchange(DLX, "direct", { durable: true });

  for (const queue of queues) {
    const dlqName = `dlq.${queue}`;
    await channel.assertQueue(dlqName, { durable: true });
    await channel.bindQueue(dlqName, DLX, dlqName);
  }

  // ── Main Exchange & Queues ─────────────────────────────────────────────────
  await channel.assertExchange(EXCHANGE, "topic", { durable: true });

  for (const queue of queues) {
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": DLX,
        "x-dead-letter-routing-key": `dlq.${queue}`,
      },
    });

    // Bind queue to exchange using queue name as routing key
    await channel.bindQueue(queue, EXCHANGE, queue);
  }
}