/**
 * Pure option/configuration logic shared by the menu (display) and the future
 * adisyon (ordering). Frameworks-free: callers pass plain group/option data
 * (Prisma rows or API shapes both satisfy these structural types).
 *
 * One mechanism — option groups with a `defaultSelected` flag — expresses all
 * three menu customizations (FR-017):
 *   - required single choice (variant): `required`, minSelect 1, maxSelect 1
 *   - optional paid add-ons:            not required, priced options
 *   - default-included removable:       `defaultSelected` options, delta 0
 *
 * Money is integer minor units (kuruş); deltas are ≥ 0 (a removable
 * ingredient is modeled as default-on with a 0 delta, never a negative price).
 */

export interface OptionInput {
  id: string
  priceDeltaMinor: number
  defaultSelected: boolean
  isAvailable: boolean
}

export interface OptionGroupInput {
  id: string
  minSelect: number
  maxSelect: number | null
  required: boolean
  options: OptionInput[]
}

/** Reasons a chosen configuration can be invalid (for the UI / error mapping). */
export type ConfigErrorReason =
  | "REQUIRED_GROUP_EMPTY"
  | "BELOW_MIN_SELECT"
  | "ABOVE_MAX_SELECT"
  | "UNKNOWN_OPTION"
  | "UNAVAILABLE_OPTION"

export type ConfigValidation =
  | { ok: true }
  | { ok: false; groupId: string | null; reason: ConfigErrorReason }

/**
 * Whether a group's own selection rule is internally consistent (FR-015).
 * Used by the API to reject a bad group with INVALID_OPTION_CONFIG before it
 * is stored — independent of any chosen configuration.
 */
export function isValidGroupRule(group: {
  minSelect: number
  maxSelect: number | null
  required: boolean
}): boolean {
  const { minSelect, maxSelect, required } = group
  if (!Number.isInteger(minSelect) || minSelect < 0) return false
  if (maxSelect !== null) {
    if (!Number.isInteger(maxSelect) || maxSelect < 1) return false
    if (maxSelect < Math.max(1, minSelect)) return false
  }
  if (required && minSelect < 1) return false
  return true
}

/** The default selection: every available option flagged `defaultSelected`. */
export function defaultConfiguration(groups: OptionGroupInput[]): string[] {
  return groups
    .flatMap((g) => g.options)
    .filter((o) => o.defaultSelected && o.isAvailable)
    .map((o) => o.id)
}

/**
 * Effective price of a configuration: base price plus the deltas of every
 * selected option (FR-019). Unknown ids contribute nothing — pricing assumes a
 * validated configuration; use {@link validateConfiguration} to reject bad input.
 */
export function effectivePriceMinor(
  basePriceMinor: number,
  groups: OptionGroupInput[],
  selectedOptionIds: Iterable<string>
): number {
  const deltas = new Map<string, number>()
  for (const g of groups)
    for (const o of g.options) deltas.set(o.id, o.priceDeltaMinor)

  let total = basePriceMinor
  for (const id of selectedOptionIds) total += deltas.get(id) ?? 0
  return total
}

/**
 * Validates a chosen configuration against every group's rules (FR-018):
 * required groups satisfied, per-group counts within min/max, and every
 * selected id references an available option.
 */
export function validateConfiguration(
  groups: OptionGroupInput[],
  selectedOptionIds: Iterable<string>
): ConfigValidation {
  const selected = new Set(selectedOptionIds)

  // Every selected id must reference a known, available option.
  const byId = new Map<string, { groupId: string; option: OptionInput }>()
  for (const g of groups)
    for (const o of g.options) byId.set(o.id, { groupId: g.id, option: o })

  for (const id of selected) {
    const found = byId.get(id)
    if (!found) return { ok: false, groupId: null, reason: "UNKNOWN_OPTION" }
    if (!found.option.isAvailable)
      return {
        ok: false,
        groupId: found.groupId,
        reason: "UNAVAILABLE_OPTION",
      }
  }

  for (const g of groups) {
    const count = g.options.filter((o) => selected.has(o.id)).length

    if (g.required && count < Math.max(1, g.minSelect))
      return { ok: false, groupId: g.id, reason: "REQUIRED_GROUP_EMPTY" }
    if (count > 0 && count < g.minSelect)
      return { ok: false, groupId: g.id, reason: "BELOW_MIN_SELECT" }
    if (g.maxSelect !== null && count > g.maxSelect)
      return { ok: false, groupId: g.id, reason: "ABOVE_MAX_SELECT" }
  }

  return { ok: true }
}
