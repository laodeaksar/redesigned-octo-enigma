// =============================================================================
// Cart controller — Elysia routes
//
// GET    /cart              → get cart with live prices
// GET    /cart/count        → item count (for badge)
// POST   /cart/items        → add item { variantId, quantity }
// PUT    /cart/items/:variantId → set exact quantity { quantity }
// DELETE /cart/items/:variantId → remove one item
// DELETE /cart              → clear all items
// POST   /cart/merge        → merge guest localStorage items on login
// =============================================================================

import { success } from "@repo/common/schemas";
import Elysia, { t } from "elysia";

import { jwtMiddleware } from "@/middleware/jwt.middleware";
import { cartService } from "./cart.service";

export const cartController = new Elysia({ prefix: "/cart" })
  .use(jwtMiddleware)

  // GET /cart/count  — lightweight badge fetch
  .get("/count", async ({ user }) => {
    const result = await cartService.getCount(user.id);
    return success(result);
  })

  // GET /cart
  .get("/", async ({ user }) => {
    const cart = await cartService.getCart(user.id);
    return success(cart);
  })

  // POST /cart/items  { variantId, quantity }
  .post(
    "/items",
    async ({ user, body }) => {
      const item = await cartService.addItem(
        user.id,
        body.variantId,
        body.quantity
      );
      return success(item);
    },
    {
      body: t.Object({
        variantId: t.String({ minLength: 1 }),
        quantity: t.Integer({ minimum: 1, maximum: 99, default: 1 }),
      }),
    }
  )

  // PUT /cart/items/:variantId  { quantity }
  .put(
    "/items/:variantId",
    async ({ user, params, body }) => {
      const item = await cartService.updateQuantity(
        user.id,
        params.variantId,
        body.quantity
      );
      return success(item);
    },
    {
      params: t.Object({ variantId: t.String() }),
      body: t.Object({
        quantity: t.Integer({ minimum: 1, maximum: 99 }),
      }),
    }
  )

  // DELETE /cart/items/:variantId
  .delete(
    "/items/:variantId",
    async ({ user, params }) => {
      const result = await cartService.removeItem(user.id, params.variantId);
      return success(result);
    },
    { params: t.Object({ variantId: t.String() }) }
  )

  // DELETE /cart  — clear all
  .delete("/", async ({ user }) => {
    const result = await cartService.clearCart(user.id);
    return success(result);
  })

  // POST /cart/merge  — called after login to sync localStorage → server
  .post(
    "/merge",
    async ({ user, body }) => {
      const cart = await cartService.mergeCart(user.id, body.items);
      return success(cart);
    },
    {
      body: t.Object({
        items: t.Array(
          t.Object({
            variantId: t.String({ minLength: 1 }),
            quantity: t.Integer({ minimum: 1, maximum: 99 }),
          }),
          { maxItems: 50 }
        ),
      }),
    }
  );
