import Elysia, { t } from "elysia";
import { wishlistService } from "./wishlist.service";
import { successResponse, paginatedResponse } from "@repo/common/schemas";
import { authMiddleware } from "@/middleware/auth.middleware"; // re-use existing

export const wishlistController = new Elysia({ prefix: "/wishlist" })
  .use(authMiddleware)

  // GET /wishlist?page=1&limit=20
  .get(
    "/",
    async ({ user, query }) => {
      const page = Number(query.page ?? 1);
      const limit = Math.min(Number(query.limit ?? 20), 100);
      const data = await wishlistService.getWishlist(user.id, page, limit);
      return paginatedResponse(data.items, data.total, page, limit);
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
      return successResponse(status);
    },
    { params: t.Object({ productId: t.String() }) }
  )

  // POST /wishlist/status/bulk  { productIds: string[] }
  .post(
    "/status/bulk",
    async ({ user, body }) => {
      const map = await wishlistService.bulkStatus(user.id, body.productIds);
      return successResponse(map);
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
      return successResponse(result);
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
      return successResponse(result);
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
      return successResponse(result);
    },
    { params: t.Object({ productId: t.String() }) }
  );
