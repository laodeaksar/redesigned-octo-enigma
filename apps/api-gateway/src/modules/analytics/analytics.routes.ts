import { Hono } from "hono";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { defaultRateLimit } from "@/middleware/rate-limit.middleware";
import { proxyRequest, buildTargetUrl } from "@/lib/proxy";
import { SERVICES } from "@/config";

const app = new Hono();
const orderBase = SERVICES.order;

const adminMw = [requireAuth, requireRole("admin", "super_admin"), defaultRateLimit] as const;

app.get("/analytics/summary",         ...adminMw, (c) => proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user }));
app.get("/analytics/revenue",         ...adminMw, (c) => proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user }));
app.get("/analytics/order-statuses",  ...adminMw, (c) => proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user }));
app.get("/analytics/top-products",    ...adminMw, (c) => proxyRequest(c, { target: buildTargetUrl(orderBase, c), user: c.var.user }));

export { app as analyticsRoutes };

