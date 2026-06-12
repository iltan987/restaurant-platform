import {
  CreditCard,
  FolderMinus,
  FolderPlus,
  Globe,
  ListChecks,
  type LucideIcon,
  Pencil,
  PowerOff,
  Rocket,
  Store,
  Trash2,
  UtensilsCrossed,
} from "lucide-react"

import { type Activity } from "@repo/schemas"

import { PLAN_LABELS } from "@/lib/plan"

const STATUS_TEXT: Record<string, string> = {
  ACTIVE: "Yayına alındı",
  INACTIVE: "Yayından kaldırıldı",
}

const ONBOARDING_TEXT: Record<string, string> = {
  IN_PROGRESS: "sürüyor",
  COMPLETED: "tamamlandı",
  SKIPPED: "atlandı",
}

function planLabel(v: unknown): string {
  const key = String(v) as keyof typeof PLAN_LABELS
  return PLAN_LABELS[key] ?? String(v)
}

/** Maps an activity row to a feed icon + a Turkish one-liner from its meta. */
export function describeActivity(a: Activity): {
  icon: LucideIcon
  text: string
} {
  const m = (a.meta ?? {}) as Record<string, unknown>
  switch (a.type) {
    case "RESTAURANT_CREATED":
      return { icon: Store, text: "Restoran oluşturuldu" }
    case "RESTAURANT_RENAMED":
      return {
        icon: Pencil,
        text: `Ad değişti: ${String(m.from)} → ${String(m.to)}`,
      }
    case "SLUG_CHANGED":
      return {
        icon: Globe,
        text: `Alan adı değişti: ${String(m.from)} → ${String(m.to)}`,
      }
    case "STATUS_CHANGED":
      return {
        icon: String(m.to) === "ACTIVE" ? Rocket : PowerOff,
        text: STATUS_TEXT[String(m.to)] ?? "Durum değişti",
      }
    case "PLAN_CHANGED":
      return {
        icon: CreditCard,
        text: `Plan: ${planLabel(m.from)} → ${planLabel(m.to)}`,
      }
    case "ONBOARDING_CHANGED":
      return {
        icon: ListChecks,
        text: `Kurulum durumu: ${ONBOARDING_TEXT[String(m.to)] ?? String(m.to)}`,
      }
    case "CATEGORY_CREATED":
      return { icon: FolderPlus, text: `Kategori eklendi: ${String(m.name)}` }
    case "CATEGORY_DELETED":
      return { icon: FolderMinus, text: `Kategori silindi: ${String(m.name)}` }
    case "MENU_ITEM_CREATED":
      return {
        icon: UtensilsCrossed,
        text: `Ürün eklendi: ${String(m.name)}`,
      }
    case "MENU_ITEM_DELETED":
      return { icon: Trash2, text: `Ürün silindi: ${String(m.name)}` }
  }
}
