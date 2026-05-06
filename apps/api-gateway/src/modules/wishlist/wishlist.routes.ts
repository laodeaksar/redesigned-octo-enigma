import { Hono } from "hono";
import { authGuard } from "@/middleware/auth.guard"; // JWT guard existing
import { proxyTo } from "@/lib/proxy";               // helper proxy existing

const wishlistRoutes = new Hono();

const PRODUCT_SERVICE = process.env.PRODUCT_SERVICE_URL ?? "<http://product-service:3002>";

// Semua endpoint wishlist butuh autentikasi
wishlistRoutes.use("/wishlist/*", authGuard);

wishlistRoutes.get("/wishlist",                     proxyTo(PRODUCT_SERVICE));
wishlistRoutes.get("/wishlist/status/:productId",   proxyTo(PRODUCT_SERVICE));
wishlistRoutes.post("/wishlist/status/bulk",        proxyTo(PRODUCT_SERVICE));
wishlistRoutes.post("/wishlist/:productId",         proxyTo(PRODUCT_SERVICE));
wishlistRoutes.delete("/wishlist/:productId",       proxyTo(PRODUCT_SERVICE));
wishlistRoutes.post("/wishlist/:productId/toggle",  proxyTo(PRODUCT_SERVICE));

export { wishlistRoutes };
