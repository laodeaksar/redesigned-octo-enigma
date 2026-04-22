// =============================================================================
// RajaOngkir API client
// Docs: https://rajaongkir.com/dokumentasi
//
// Supported couriers: jne, pos, tiki, rpx, esl, pcp, j&t, sap, sicepat,
//                     jnt, pahala, slis, jet, indah, dse, first, ncs,
//                     star, ninja, lion, idl, rex, ide, sentral, anteraja
// =============================================================================

import { env } from "@/config";

const BASE_URL = "https://api.rajaongkir.com/starter";
const API_KEY  = env.RAJAONGKIR_API_KEY;
const ORIGIN   = env.RAJAONGKIR_ORIGIN;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShippingCost {
  service:     string;
  description: string;
  cost:        number;
  etd:         string;  // estimated time of delivery e.g. "2-3"
}

export interface CourierRates {
  courier: string;
  name:    string;
  rates:   ShippingCost[];
}

export interface City {
  id:         string;
  provinceId: string;
  province:   string;
  type:       string;  // Kota | Kabupaten
  name:       string;
  postalCode: string;
}

// ── Core fetch ────────────────────────────────────────────────────────────────

async function rajaFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "key":          API_KEY,
      "content-type": "application/x-www-form-urlencoded",
      ...options.headers,
    },
  });

  const json = await res.json() as {
    rajaongkir: { status: { code: number; description: string }; results: T };
  };

  if (json.rajaongkir.status.code !== 200) {
    throw new Error(
      `RajaOngkir error: ${json.rajaongkir.status.description}`
    );
  }

  return json.rajaongkir.results;
}

// ── Cities ────────────────────────────────────────────────────────────────────

/**
 * Get all cities from RajaOngkir.
 * Response is cached per-process — city list rarely changes.
 */
let _citiesCache: City[] | null = null;

export async function getAllCities(): Promise<City[]> {
  if (_citiesCache) return _citiesCache;

  const results = await rajaFetch<Array<{
    city_id: string; province_id: string; province: string;
    type: string; city_name: string; postal_code: string;
  }>>("/city");

  _citiesCache = results.map((c) => ({
    id:         c.city_id,
    provinceId: c.province_id,
    province:   c.province,
    type:       c.type,
    name:       c.city_name,
    postalCode: c.postal_code,
  }));

  return _citiesCache;
}

export async function searchCities(query: string): Promise<City[]> {
  const cities = await getAllCities();
  const q = query.toLowerCase();
  return cities.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.province.toLowerCase().includes(q) ||
      c.postalCode.includes(q)
  );
}

// ── Shipping rates ─────────────────────────────────────────────────────────────

export interface GetRatesInput {
  destinationCityId: string;
  weightGrams:       number;
  couriers?:         string[];
}

const DEFAULT_COURIERS = ["jne", "jnt", "sicepat", "anteraja", "tiki"];

/**
 * Get shipping cost from the warehouse origin to a destination city.
 *
 * @param input.destinationCityId  RajaOngkir city ID for the recipient
 * @param input.weightGrams        Total package weight in grams
 * @param input.couriers           Couriers to query (default: jne, jnt, sicepat, anteraja, tiki)
 */
export async function getShippingRates(
  input: GetRatesInput
): Promise<CourierRates[]> {
  const couriers = input.couriers ?? DEFAULT_COURIERS;
  const weightKg = Math.max(1, Math.ceil(input.weightGrams / 1000)); // min 1 kg

  // RajaOngkir starter plan: one courier per request
  const results = await Promise.allSettled(
    couriers.map((courier) =>
      rajaFetch<Array<{
        code: string;
        name: string;
        costs: Array<{
          service: string;
          description: string;
          cost: Array<{ value: number; etd: string; note: string }>;
        }>;
      }>>("/cost", {
        method: "POST",
        body: new URLSearchParams({
          origin:      ORIGIN,
          destination: input.destinationCityId,
          weight:      String(weightKg * 1000), // RajaOngkir uses grams
          courier,
        }).toString(),
      })
    )
  );

  return results
    .filter((r): r is PromiseFulfilledResult<typeof r extends PromiseFulfilledResult<infer V> ? V : never> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .map((result) => ({
      courier:  result.code,
      name:     result.name,
      rates: result.costs
        .map((s) => ({
          service:     s.service,
          description: s.description,
          cost:        s.cost[0]?.value ?? 0,
          etd:         (s.cost[0]?.etd ?? "").replace(/\s+HARI/i, "").trim(),
        }))
        .filter((s) => s.cost > 0),
    }))
    .filter((r) => r.rates.length > 0);
}

/**
 * Get the cheapest rate for a given courier + service combination.
 */
export async function getSingleRate(
  destinationCityId: string,
  weightGrams: number,
  courier: string,
  service: string
): Promise<number> {
  const rates = await getShippingRates({
    destinationCityId,
    weightGrams,
    couriers: [courier],
  });

  const courierRates = rates.find(
    (r) => r.courier.toLowerCase() === courier.toLowerCase()
  );

  const serviceRate = courierRates?.rates.find(
    (r) => r.service.toUpperCase() === service.toUpperCase()
  );

  return serviceRate?.cost ?? 0;
}

