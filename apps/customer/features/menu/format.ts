import {
  type DayOfWeek,
  formatPriceMinor,
  type ServingUnit,
  unitPrice,
} from "@repo/core"
import { type MenuTreeItem } from "@repo/schemas"

/**
 * Lira for the menu surface: whole amounts render without the ",00" tail
 * (₺340), fractional ones keep two places (₺12,50). `formatPriceMinor` is the
 * canonical formatter; we only trim the decimals at the display edge here.
 */
export function formatTRY(minor: number): string {
  const full = formatPriceMinor(minor)
  return minor % 100 === 0 ? full.replace(/[.,]00$/, "") : full
}

const SERVING_UNIT_LABEL: Record<ServingUnit, string> = {
  GRAM: "g",
  KILOGRAM: "kg",
  MILLILITER: "ml",
  LITER: "L",
  PIECE: "adet",
  PORTION: "porsiyon",
}

/** e.g. `200 g`, `1 porsiyon`. Null when the item has no serving size. */
export function servingLabel(item: MenuTreeItem): string | null {
  if (item.servingAmount == null || item.servingUnit == null) return null
  return `${item.servingAmount} ${SERVING_UNIT_LABEL[item.servingUnit]}`
}

/** Normalized unit price, e.g. `₺1.700/kg`. Null when it can't be shown. */
export function unitPriceLabel(item: MenuTreeItem): string | null {
  const up = unitPrice(item.priceMinor, item.servingAmount, item.servingUnit)
  return up ? `${formatTRY(up.perUnitMinor)}/${up.unit}` : null
}

const DAY_LABEL: Record<DayOfWeek, string> = {
  MON: "Pzt",
  TUE: "Sal",
  WED: "Çar",
  THU: "Per",
  FRI: "Cum",
  SAT: "Cmt",
  SUN: "Paz",
}
const WEEK_ORDER: DayOfWeek[] = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
]

function formatDays(days: DayOfWeek[]): string {
  if (days.length === 7) return "Her gün"
  const set = new Set(days)
  if (set.size === 2 && set.has("SAT") && set.has("SUN")) return "Hafta sonu"
  if (
    set.size === 5 &&
    (["MON", "TUE", "WED", "THU", "FRI"] as const).every((d) => set.has(d))
  ) {
    return "Hafta içi"
  }
  return WEEK_ORDER.filter((d) => set.has(d))
    .map((d) => DAY_LABEL[d])
    .join(" & ")
}

function minutesToClock(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Human window line, e.g. `Hafta içi 08:00–11:00`. */
export function windowText(window: {
  days: DayOfWeek[]
  startMin: number
  endMin: number
}): string {
  return `${formatDays(window.days)} ${minutesToClock(window.startMin)}–${minutesToClock(window.endMin)}`
}

// ── tag visual variants ──
// Tags are free-text; map well-known Turkish dietary/flavour labels to a
// coloured variant, everything else to the neutral default.
export type TagVariant = "veg" | "spicy" | "chef" | "default"

const TAG_VARIANT: Record<string, TagVariant> = {
  vegan: "veg",
  vejetaryen: "veg",
  acılı: "spicy",
  "şefin önerisi": "chef",
  şef: "chef",
}

export function tagVariant(label: string): TagVariant {
  return TAG_VARIANT[label.trim().toLocaleLowerCase("tr")] ?? "default"
}

// ── item availability (from the server-computed orderableNow) ──
export type ItemState = "available" | "sold-out" | "off-hours"

export function itemState(item: MenuTreeItem): ItemState {
  if (item.orderableNow.ok) return "available"
  return item.orderableNow.reason === "OUT_OF_STOCK" ? "sold-out" : "off-hours"
}
