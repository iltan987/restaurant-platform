import { type RestaurantWithCounts } from "@repo/schemas"

import { type ConsoleStatus } from "@/components/console/status-pill"

/** Optimistic rows (from create) carry a sentinel id until the server responds. */
export function isOptimistic(r: { id: string }): boolean {
  return r.id.startsWith("__optimistic__")
}

/**
 * The backend only knows ACTIVE/INACTIVE + onboardingStatus, so the console's
 * richer lifecycle is derived: live once active; draft while still empty
 * (freshly created, no tables or menu yet); otherwise actively in setup.
 * "suspended" has no backend yet and is never produced here.
 */
export function deriveStatus(r: RestaurantWithCounts): ConsoleStatus {
  if (r.status === "ACTIVE") return "live"
  if (r.tableCount === 0 && r.menuItemCount === 0) return "draft"
  return "setup"
}

export type SetupStep = {
  id: "profile" | "floors" | "tables" | "menu" | "qr"
  label: string
  hint: string
  done: boolean
}

/**
 * The per-restaurant setup checklist, derived from what actually exists. QR is
 * a function of tables (codes are generated per table), so it tracks tableCount.
 */
export function setupChecklist(r: RestaurantWithCounts): SetupStep[] {
  return [
    {
      id: "profile",
      label: "Profil",
      hint: "Ad, slug ve temel bilgiler",
      done: true,
    },
    {
      id: "floors",
      label: "Kat planı",
      hint: "Katlar ve alanlar",
      done: r.floorCount > 0 && r.areaCount > 0,
    },
    {
      id: "tables",
      label: "Masalar",
      hint: "Masa düzeni ve kapasiteler",
      done: r.tableCount > 0,
    },
    {
      id: "menu",
      label: "Menü",
      hint: "Kategoriler ve ürünler",
      done: r.menuItemCount > 0,
    },
    {
      id: "qr",
      label: "QR kodları",
      hint: "Masa QR'larını üret ve bas",
      done: r.tableCount > 0,
    },
  ]
}

export function setupProgress(r: RestaurantWithCounts): {
  done: number
  total: number
  pct: number
} {
  const steps = setupChecklist(r)
  const done = steps.filter((s) => s.done).length
  return {
    done,
    total: steps.length,
    pct: Math.round((done / steps.length) * 100),
  }
}

export type FleetStats = {
  total: number
  live: number
  setup: number
  draft: number
  suspended: number
}

/** Status breakdown over a set of restaurants (the current page). */
export function fleetStats(items: RestaurantWithCounts[]): FleetStats {
  const stats: FleetStats = {
    total: items.length,
    live: 0,
    setup: 0,
    draft: 0,
    suspended: 0,
  }
  for (const r of items) {
    const s = deriveStatus(r)
    if (s === "live") stats.live++
    else if (s === "setup") stats.setup++
    else if (s === "draft") stats.draft++
  }
  return stats
}
