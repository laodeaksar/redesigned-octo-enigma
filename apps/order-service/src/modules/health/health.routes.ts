import { db } from "@/config";
import { sql } from "drizzle-orm";
import Elysia from "elysia";

import { success } from "@repo/common/schemas";
import { isMongoConnected } from "@repo/database/mongo";

export const healthRoutes = new Elysia({ prefix: "/health" }).get(
  "/",
  async () => {
    const checks: Record<string, "ok" | "error"> = {};

    // MongoDB
    checks["mongodb"] = isMongoConnected() ? "ok" : "error";

    // PostgreSQL (vouchers)
    try {
      await db.execute(sql`SELECT 1`);
      checks["postgres"] = "ok";
    } catch {
      checks["postgres"] = "error";
    }

    const allOk = Object.values(checks).every(v => v === "ok");

    return success({
      status: allOk ? "ok" : "degraded",
      service: "order-service",
      version: "1.0.0",
      uptime: process.uptime(),
      timestamp: new Date(),
      checks,
    });
  },
  { detail: { tags: ["Health"], summary: "Service health check" } }
);
