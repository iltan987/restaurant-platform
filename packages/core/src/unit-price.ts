/**
 * Normalized unit price for display (FR-009): given an item price and a serving
 * amount + unit, express the price per kilogram / per litre / per piece so
 * diners can compare ("₺120 · 500 g" → "₺240/kg"). Pure; money in kuruş.
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

/** The normalized unit a price is expressed per. PORTION yields no unit price. */
export type DisplayUnit = "kg" | "L" | "adet"

export interface UnitPrice {
  perUnitMinor: number
  unit: DisplayUnit
}

/** Conversion to the base display unit: how many serving-units make one display-unit. */
const PER_DISPLAY_UNIT: Record<
  Exclude<ServingUnit, "PORTION">,
  { unit: DisplayUnit; divisor: number }
> = {
  GRAM: { unit: "kg", divisor: 1000 },
  KILOGRAM: { unit: "kg", divisor: 1 },
  MILLILITER: { unit: "L", divisor: 1000 },
  LITER: { unit: "L", divisor: 1 },
  PIECE: { unit: "adet", divisor: 1 },
}

/**
 * Returns the normalized unit price, or `null` when it cannot/should not be
 * shown (no unit, non-positive/empty amount, or PORTION). Result is rounded to
 * the nearest kuruş.
 */
export function unitPrice(
  priceMinor: number,
  servingAmount: number | null | undefined,
  servingUnit: ServingUnit | null | undefined
): UnitPrice | null {
  if (servingUnit == null || servingUnit === "PORTION") return null
  if (servingAmount == null || !(servingAmount > 0)) return null

  const { unit, divisor } = PER_DISPLAY_UNIT[servingUnit]
  const perUnitMinor = Math.round((priceMinor / servingAmount) * divisor)
  return { perUnitMinor, unit }
}
