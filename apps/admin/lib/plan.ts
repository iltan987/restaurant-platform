import { type Plan } from "@repo/schemas"

/** Turkish display name per billing tier. */
export const PLAN_LABELS: Record<Plan, string> = {
  FREE: "Ücretsiz",
  PRO: "Pro",
  ENTERPRISE: "Kurumsal",
}

/** One-line capability hint shown on each tier card. */
export const PLAN_HINTS: Record<Plan, string> = {
  FREE: "Tek kat · QR menü",
  PRO: "Çok kat · sınırsız alan · sipariş",
  ENTERPRISE: "Çok şube · özel SLA · API",
}

/** Turkish labels for the (currently single-option) locale fields. */
export const LANGUAGE_LABELS: Record<string, string> = {
  tr: "Türkçe",
}

export const CURRENCY_LABELS: Record<string, string> = {
  TRY: "₺ Türk lirası (TRY)",
}
