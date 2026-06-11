/**
 * Availability windows + "orderable right now?" (FR-020/FR-021). Pure: the
 * caller supplies the local "now" (day + minutes-since-midnight); a helper
 * derives it for Türkiye (Europe/Istanbul, fixed UTC+3, no DST) via Intl, so no
 * date library is needed.
 *
 * A window spans days-of-week × [startMin, endMin). `endMin < startMin` means it
 * crosses midnight: it runs from startMin on each listed day to endMin the next
 * morning. An item with no windows is always available (when in stock).
 */

export const DAYS_OF_WEEK = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
] as const

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

export interface AvailabilityWindowInput {
  days: DayOfWeek[]
  startMin: number
  endMin: number
}

export interface ItemAvailability {
  inStock: boolean
  windows: AvailabilityWindowInput[]
}

export interface LocalNow {
  day: DayOfWeek
  /** Minutes since local midnight, 0–1439. */
  minutes: number
}

export type OrderableReason = "OUT_OF_STOCK" | "OUTSIDE_WINDOW"

export type Orderable = { ok: true } | { ok: false; reason: OrderableReason }

const MINUTES_IN_DAY = 1440

/** A window's rule is consistent: non-empty days, in-range, non-zero length. */
export function isValidWindow(window: AvailabilityWindowInput): boolean {
  const { days, startMin, endMin } = window
  if (days.length === 0) return false
  for (const value of [startMin, endMin]) {
    if (!Number.isInteger(value) || value < 0 || value >= MINUTES_IN_DAY) {
      return false
    }
  }
  return startMin !== endMin
}

function prevDay(day: DayOfWeek): DayOfWeek {
  const i = DAYS_OF_WEEK.indexOf(day)
  return DAYS_OF_WEEK[(i + DAYS_OF_WEEK.length - 1) % DAYS_OF_WEEK.length]!
}

/** Whether a single window is active at the given local day + minutes. */
export function isWindowActive(
  window: AvailabilityWindowInput,
  now: LocalNow
): boolean {
  const { days, startMin, endMin } = window
  const crossesMidnight = endMin < startMin

  if (!crossesMidnight) {
    return (
      days.includes(now.day) && now.minutes >= startMin && now.minutes < endMin
    )
  }

  // Crosses midnight: [startMin, 1440) on a listed day, or [0, endMin) the
  // morning after a listed day.
  const startSegment = days.includes(now.day) && now.minutes >= startMin
  const tailSegment = days.includes(prevDay(now.day)) && now.minutes < endMin
  return startSegment || tailSegment
}

/**
 * "Orderable right now?": in stock AND (no windows OR inside ≥1 window).
 * Returns a reason when not orderable so consumers can explain it (FR-029).
 */
export function isOrderableNow(
  item: ItemAvailability,
  now: LocalNow
): Orderable {
  if (!item.inStock) return { ok: false, reason: "OUT_OF_STOCK" }
  if (item.windows.length === 0) return { ok: true }
  const active = item.windows.some((w) => isWindowActive(w, now))
  return active ? { ok: true } : { ok: false, reason: "OUTSIDE_WINDOW" }
}

const WEEKDAY_TO_DAY: Record<string, DayOfWeek> = {
  Mon: "MON",
  Tue: "TUE",
  Wed: "WED",
  Thu: "THU",
  Fri: "FRI",
  Sat: "SAT",
  Sun: "SUN",
}

/**
 * Derives the Europe/Istanbul local day + minutes for a given instant via Intl
 * (no date library). Türkiye is a single fixed-offset timezone.
 */
export function istanbulNow(date: Date): LocalNow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  const day = WEEKDAY_TO_DAY[get("weekday")] ?? "MON"
  const minutes = Number(get("hour")) * 60 + Number(get("minute"))
  return { day, minutes }
}
