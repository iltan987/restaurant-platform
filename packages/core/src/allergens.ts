/**
 * The 14 major allergens mandated by EU food-information rules (EU FIC
 * 1169/2011), in Turkish — the set every restaurant is seeded with on creation
 * (research §8). Restaurants extend this with custom entries (e.g. "Domates");
 * the seeded set is marked `isStandard` and protected from deletion.
 *
 * Order is the conventional EU listing order; it is not significant.
 */
export const STANDARD_ALLERGENS = [
  "Gluten içeren tahıllar",
  "Kabuklu deniz ürünleri",
  "Yumurta",
  "Balık",
  "Yer fıstığı",
  "Soya",
  "Süt",
  "Sert kabuklu yemişler",
  "Kereviz",
  "Hardal",
  "Susam",
  "Kükürt dioksit ve sülfitler",
  "Acı bakla (lüpen)",
  "Yumuşakçalar",
] as const

export type StandardAllergen = (typeof STANDARD_ALLERGENS)[number]
