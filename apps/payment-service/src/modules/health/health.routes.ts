import Elysia from "elysia";
import { sql } from "drizzle-orm";
import { success } from "@repo/common/schemas";
import { db } from "@/config";

export const healthRoutes = new Elysia({ prefix: "/health" }).get(
  "/",
  async () => {
    const checks: Record<string, "ok" | "error"> = {};

    try {
      await db.execute(sql`SELECT 1`);
      checks["postgres"] = "ok";
    } catch {
      checks["postgres"] = "error";
    }

    const allOk = Object.values(checks).every((v) => v === "ok");

    return success({
      status: allOk ? "ok" : "degraded",
      service: "payment-service",
      version: "1.0.0",
      uptime: process.uptime(),
      timestamp: new Date(),
      checks,
    });
  },
  { detail: { tags: ["Health"], summary: "Service health check" } }
);

