/**
 * Money is stored and computed as integer **minor units** (kuruş) everywhere,
 * so there is never a floating-point rounding error in a stored or effective
 * price (spec SC-003). These helpers only convert at the display/input edge.
 *
 * Turkish locale: "₺1.234,56" (dot thousands, comma decimal).
 */

const TRY_FORMAT = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
})

/** Formats integer kuruş as a Turkish lira string, e.g. 123456 → "₺1.234,56". */
export function formatPriceMinor(minor: number): string {
  return TRY_FORMAT.format(minor / 100)
}

/**
 * Parses a user-typed major-unit amount into integer kuruş. Accepts Turkish
 * formatting ("1.234,56" → comma decimal, dot thousands) and a plain
 * English-style single dot ("10.50"). Returns `null` for empty/invalid/
 * negative input so the caller can surface a validation error.
 */
export function parsePriceToMinor(input: string): number | null {
  let cleaned = input.replace(/[₺\s]/g, "")
  if (cleaned === "") return null

  if (cleaned.includes(",")) {
    // Turkish: comma is the decimal mark, dots are thousands separators.
    cleaned = cleaned.replace(/\./g, "").replace(",", ".")
  } else {
    // Only dots: a single dot reads as a decimal point; multiple dots are
    // thousands separators ("1.234.567").
    const dotCount = (cleaned.match(/\./g) ?? []).length
    if (dotCount > 1) cleaned = cleaned.replace(/\./g, "")
  }

  const major = Number(cleaned)
  if (!Number.isFinite(major) || major < 0) return null
  return Math.round(major * 100)
}
