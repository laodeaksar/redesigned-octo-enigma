// =============================================================================
// Wishlist controller
// =============================================================================

import Elysia, { t } from "elysia";
import { wishlistService } from "./wishlist.service";
import { success, paginated } from "@repo/common/schemas";
import { jwtMiddleware } from "@/middleware/jwt.middleware";

export const wishlistController = new Elysia({ prefix: "/wishlist" })
  .use(jwtMiddleware)

  // GET /wishlist?page=1&limit=20
  .get(
    "/",
    async ({ user, query }) => {
      const page = Number(query.page ?? 1);
      const limit = Math.min(Number(query.limit ?? 20), 100);
      const data = await wishlistService.getWishlist(user.id, page, limit);
      return paginated(data.items, { total: data.total, page, limit });
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  // GET /wishlist/status/:productId
  .get(
    "/status/:productId",
    async ({ user, params }) => {
      const status = await wishlistService.getStatus(user.id, params.productId);
      return success(status);
    },
    { params: t.Object({ productId: t.String() }) }
  )

  // POST /wishlist/status/bulk  { productIds: string[] }
  .post(
    "/status/bulk",
    async ({ user, body }) => {
      const map = await wishlistService.bulkStatus(user.id, body.productIds);
      return success(map);
    },
    {
      body: t.Object({
        productIds: t.Array(t.String(), { maxItems: 100 }),
      }),
    }
  )

  // POST /wishlist/:productId  — add
  .post(
    "/:productId",
    async ({ user, params }) => {
      const result = await wishlistService.addToWishlist(
        user.id,
        params.productId
      );
      return success(result);
    },
    { params: t.Object({ productId: t.String() }) }
  )

  // DELETE /wishlist/:productId  — remove
  .delete(
    "/:productId",
    async ({ user, params }) => {
      const result = await wishlistService.removeFromWishlist(
        user.id,
        params.productId
      );
      return success(result);
    },
    { params: t.Object({ productId: t.String() }) }
  )

  // POST /wishlist/:productId/toggle
  .post(
    "/:productId/toggle",
    async ({ user, params }) => {
      const result = await wishlistService.toggleWishlist(
        user.id,
        params.productId
      );
      return success(result);
    },
    { params: t.Object({ productId: t.String() }) }
  );
