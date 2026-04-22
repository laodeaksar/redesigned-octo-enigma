// =============================================================================
// Shipping routes
//
//  GET  /shipping/cities            — search cities by name/province/postal code
//  POST /shipping/rates             — get shipping rates for a destination
// =============================================================================

import Elysia, { t } from "elysia";
import { success } from "@repo/common/schemas";
import { getShippingRates, searchCities } from "@/lib/rajaongkir";

export const shippingRoutes = new Elysia({ prefix: "/shipping" })

  // ── City search ─────────────────────────────────────────────────────────────
  .get(
    "/cities",
    async ({ query }) => {
      const cities = await searchCities(query.q);
      return success(cities);
    },
    {
      query: t.Object({
        q: t.String({ minLength: 2, description: "City/province/postal code query" }),
      }),
      detail: {
        tags: ["Shipping"],
        summary: "Search destination cities",
      },
    }
  )

  // ── Shipping rates ───────────────────────────────────────────────────────────
  .post(
    "/rates",
    async ({ body }) => {
      const rates = await getShippingRates({
        destinationCityId: body.destinationCityId,
        weightGrams:       body.weightGrams,
        couriers:          body.couriers ?? undefined,
      });
      return success(rates);
    },
    {
      body: t.Object({
        destinationCityId: t.String({ minLength: 1 }),
        weightGrams:       t.Number({ minimum: 1, maximum: 30_000 }),
        couriers: t.Optional(
          t.Array(t.String(), {
            description: "Couriers to query. Defaults to jne, jnt, sicepat, anteraja, tiki",
          })
        ),
      }),
      detail: {
        tags: ["Shipping"],
        summary: "Calculate shipping rates to a destination city",
      },
    }
  );

