/**
 * In-memory menu search (FR-026, research §6). The customer app loads the
 * whole menu tree once and filters it client-side as the user types — no
 * round-trips. Matching is Turkish-aware: case- and diacritic-insensitive, so
 * "doner" finds "Döner" and "icecek" finds "İçecek".
 *
 * Pure and structurally typed so it stays framework- and schema-agnostic; the
 * customer passes its `MenuTree` categories straight in.
 */

export interface SearchableItem {
  name: string
  description?: string | null
  tags?: { label: string }[]
}

export interface SearchableCategory {
  name: string
  items: SearchableItem[]
}

const TR_FOLD: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
}

/**
 * Folds a string for accent-insensitive Turkish comparison: dotted/dotless I
 * are unified before lowercasing (JS would otherwise emit a combining dot),
 * then the remaining Turkish letters map to their ASCII bases.
 */
export function normalizeTr(input: string): string {
  return input
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .toLowerCase()
    .replace(/[çğıöşü]/g, (ch) => TR_FOLD[ch] ?? ch)
    .trim()
}

function itemMatches(item: SearchableItem, q: string): boolean {
  if (normalizeTr(item.name).includes(q)) return true
  if (item.description && normalizeTr(item.description).includes(q)) return true
  return (item.tags ?? []).some((t) => normalizeTr(t.label).includes(q))
}

/**
 * Filters menu categories by a free-text query. A blank query returns the tree
 * unchanged. A category whose name matches keeps all its items; otherwise only
 * its matching items survive, and categories left with no items drop out.
 */
export function searchMenu<C extends SearchableCategory>(
  categories: C[],
  query: string
): C[] {
  const q = normalizeTr(query)
  if (q === "") return categories

  const result: C[] = []
  for (const category of categories) {
    if (normalizeTr(category.name).includes(q)) {
      result.push(category)
      continue
    }
    const items = category.items.filter((item) => itemMatches(item, q))
    if (items.length > 0) result.push({ ...category, items })
  }
  return result
}
