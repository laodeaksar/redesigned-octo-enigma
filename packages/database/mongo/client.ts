// =============================================================================
// MongoDB client factory (Mongoose)
// Managed by: order-service
// =============================================================================

import mongoose from "mongoose";

export interface MongoClientOptions {
  url: string;
  dbName: string;
  /** Log mongoose queries — set to true in development only */
  debug?: boolean;
}

let isConnected = false;

/**
 * Connect to MongoDB via Mongoose (singleton — safe to call multiple times).
 *
 * Usage (in a service's src/db.ts):
 *   import { connectMongo } from "@repo/database/mongo"
 *   import { env } from "@repo/env/order-service"
 *
 *   await connectMongo({ url: env.MONGODB_URL, dbName: env.MONGODB_DB_NAME })
 */
export async function connectMongo(options: MongoClientOptions): Promise<void> {
  if (isConnected) return;

  const { url, dbName, debug = false } = options;

  mongoose.set("debug", debug);

  // Strict mode: throw on fields not in schema (good for catching typos)
  mongoose.set("strict", true);

  // Return plain JS objects instead of Mongoose Documents where possible
  mongoose.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      // Rename _id → id for consistency with the rest of the codebase
      ret["id"] = ret["_id"];
      delete ret["_id"];
      return ret;
    },
  });

  try {
    await mongoose.connect(url, {
      dbName,
      maxPoolSize: 10,
      minPoolSize: 2,
      connectTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      serverSelectionTimeoutMS: 10_000,
      heartbeatFrequencyMS: 10_000,
      retryWrites: true,
      retryReads: true,
    });

    isConnected = true;
    console.info(`[MongoDB] Connected to '${dbName}'`);
  } catch (error) {
    console.error("[MongoDB] Connection failed:", error);
    throw error;
  }

  // ── Event listeners ────────────────────────────────────────────────────────
  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.warn("[MongoDB] Disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    isConnected = true;
    console.info("[MongoDB] Reconnected");
  });

  mongoose.connection.on("error", (err) => {
    console.error("[MongoDB] Connection error:", err);
  });
}

/**
 * Gracefully close the MongoDB connection.
 * Call during service shutdown (SIGTERM / SIGINT).
 */
export async function disconnectMongo(): Promise<void> {
  if (!isConnected) return;

  await mongoose.connection.close();
  isConnected = false;
  console.info("[MongoDB] Connection closed");
}

/** Check if MongoDB is currently connected */
export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export { mongoose };
