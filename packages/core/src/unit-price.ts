/**
 * Normalized unit price for display (FR-009): given an item price and a serving
 * amount + unit, express the price per kilogram / 100 g / litre / 100 ml /
 * piece so diners can compare ("₺120 · 500 g" → "₺24/100 g"). Pure; money in
 * kuruş.
 *
 * Visibility and magnitude are governed by a per-item {@link UnitPriceBasis}:
 * `AUTO` (the default) lets the heuristic below decide both; `HIDE` suppresses
 * it; the explicit `PER_*` values force a magnitude. The heuristic exists
 * because a flat "per kg / per L" reads badly in a restaurant: meat at
 * ₺962,50/kg looks aggressive (₺96,25/100 g reads fine), and a per-L price on a
 * tiny Turkish-coffee serving is meaningless — while ayran per-L is useful.
 *
 * The serving-unit value set lives here (lowest pure layer) and is reused by
 * @repo/schemas (z.enum) and mirrored by the Prisma `ServingUnit` enum.
 */

export const SERVING_UNITS = [
  "GRAM",
  "KILOGRAM",
  "MILLILITER",
  "LITER",
  "PIECE",
  "PORTION",
] as const

export type ServingUnit = (typeof SERVING_UNITS)[number]

/** Per-item control over the unit-price line; mirrors the Prisma enum. */
export const UNIT_PRICE_BASES = [
  "AUTO",
  "HIDE",
  "PER_KG",
  "PER_100G",
  "PER_L",
  "PER_100ML",
  "PER_PIECE",
] as const

export type UnitPriceBasis = (typeof UNIT_PRICE_BASES)[number]

/** The normalized unit a price is expressed per. PORTION yields no unit price. */
export type DisplayUnit = "kg" | "100 g" | "L" | "100 ml" | "adet"

export interface UnitPrice {
  perUnitMinor: number
  unit: DisplayUnit
}

/** AUTO tuning knobs (documented so they're easy to adjust). */
// Above this per-kg price, weight items read better as per-100 g.
const AUTO_PER_100G_THRESHOLD_MINOR = 30_000 // ₺300/kg
// Below this serving volume, a per-litre price is misleading (coffee/espresso).
const AUTO_VOLUME_MIN_ML = 200

type Magnitude = Extract<
  UnitPriceBasis,
  "PER_KG" | "PER_100G" | "PER_L" | "PER_100ML" | "PER_PIECE"
>

/** grams in one serving, or null when the unit isn't weight-based. */
function grams(amount: number, unit: ServingUnit): number | null {
  if (unit === "GRAM") return amount
  if (unit === "KILOGRAM") return amount * 1000
  return null
}

/** millilitres in one serving, or null when the unit isn't volume-based. */
function millilitres(amount: number, unit: ServingUnit): number | null {
  if (unit === "MILLILITER") return amount
  if (unit === "LITER") return amount * 1000
  return null
}

/** Price at a forced magnitude, or null when it doesn't fit the serving unit. */
function atMagnitude(
  priceMinor: number,
  amount: number,
  unit: ServingUnit,
  magnitude: Magnitude
): UnitPrice | null {
  const g = grams(amount, unit)
  const ml = millilitres(amount, unit)
  switch (magnitude) {
    case "PER_KG":
      return g
        ? { perUnitMinor: Math.round((priceMinor / g) * 1000), unit: "kg" }
        : null
    case "PER_100G":
      return g
        ? { perUnitMinor: Math.round((priceMinor / g) * 100), unit: "100 g" }
        : null
    case "PER_L":
      return ml
        ? { perUnitMinor: Math.round((priceMinor / ml) * 1000), unit: "L" }
        : null
    case "PER_100ML":
      return ml
        ? { perUnitMinor: Math.round((priceMinor / ml) * 100), unit: "100 ml" }
        : null
    case "PER_PIECE":
      return unit === "PIECE"
        ? { perUnitMinor: Math.round(priceMinor / amount), unit: "adet" }
        : null
  }
}

/** AUTO: pick visibility + magnitude per the heuristic described up top. */
function autoMagnitude(
  priceMinor: number,
  amount: number,
  unit: ServingUnit
): Magnitude | null {
  const g = grams(amount, unit)
  if (g != null) {
    const perKg = (priceMinor / g) * 1000
    return perKg >= AUTO_PER_100G_THRESHOLD_MINOR ? "PER_100G" : "PER_KG"
  }
  const ml = millilitres(amount, unit)
  if (ml != null) return ml < AUTO_VOLUME_MIN_ML ? null : "PER_L"
  // PIECE: a per-piece price only adds information when there's >1 piece.
  if (unit === "PIECE") return amount > 1 ? "PER_PIECE" : null
  return null
}

/**
 * Returns the unit price to display, or `null` when it cannot/should not be
 * shown (no/empty amount, PORTION, `HIDE`, an explicit magnitude that doesn't
 * fit the unit, or AUTO deciding to suppress it). Rounded to the nearest kuruş.
 */
export function resolveUnitPrice(
  priceMinor: number,
  servingAmount: number | null | undefined,
  servingUnit: ServingUnit | null | undefined,
  basis: UnitPriceBasis = "AUTO"
): UnitPrice | null {
  if (basis === "HIDE") return null
  if (servingUnit == null || servingUnit === "PORTION") return null
  if (servingAmount == null || !(servingAmount > 0)) return null

  if (basis !== "AUTO") {
    const forced = atMagnitude(priceMinor, servingAmount, servingUnit, basis)
    if (forced) return forced
    // Incompatible explicit basis (e.g. PER_L on a weight item) → fall back.
  }

  const magnitude = autoMagnitude(priceMinor, servingAmount, servingUnit)
  return magnitude
    ? atMagnitude(priceMinor, servingAmount, servingUnit, magnitude)
    : null
}
