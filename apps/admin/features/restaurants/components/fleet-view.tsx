"use client"

import { useQuery } from "@tanstack/react-query"
import { Download, LayoutGrid, List, Search, Store } from "lucide-react"
import { useState, useSyncExternalStore } from "react"

import { Button } from "@repo/ui/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/ui/tooltip"
import { cn } from "@repo/ui/lib/utils"

import { PageHeader } from "@/components/console/page-header"

import { deriveStatus, fleetStats } from "../lib/derive"
import { restaurantsQueries } from "../queries"
import { CreateRestaurantDialog } from "./create-restaurant-dialog"
import { FleetCard } from "./fleet-card"
import {
  FleetFilters,
  type PlanFilter,
  type StatusFilter,
} from "./fleet-filters"
import { FleetTable } from "./fleet-table"
import { Pager } from "./pager"
import { RestaurantSkeleton } from "./restaurant-skeleton"

type ViewMode = "list" | "grid"
const VIEW_KEY = "admin.fleet.view"
const VIEW_EVENT = "admin:fleetview"

function subscribeView(cb: () => void): () => void {
  window.addEventListener("storage", cb)
  window.addEventListener(VIEW_EVENT, cb)
  return () => {
    window.removeEventListener("storage", cb)
    window.removeEventListener(VIEW_EVENT, cb)
  }
}

/**
 * List/grid preference, persisted to localStorage and read via
 * useSyncExternalStore so it's SSR-safe (server renders "list") and avoids a
 * setState-in-effect.
 */
function useViewMode(): [ViewMode, (v: ViewMode) => void] {
  const view = useSyncExternalStore(
    subscribeView,
    () => (localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "list"),
    () => "list" as ViewMode
  )
  const set = (v: ViewMode) => {
    localStorage.setItem(VIEW_KEY, v)
    window.dispatchEvent(new Event(VIEW_EVENT))
  }
  return [view, set]
}

export function FleetView() {
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [plan, setPlan] = useState<PlanFilter>("all")
  const [view, setView] = useViewMode()

  const { data, isPending } = useQuery(restaurantsQueries.list(page))
  const items = data?.items ?? []
  const stats = fleetStats(items)

  const q = query.trim().toLowerCase()
  const filtered = items.filter((r) => {
    if (status !== "all" && deriveStatus(r) !== status) return false
    if (plan !== "all" && r.plan !== plan) return false
    if (q) {
      const hay = `${r.name} ${r.slug}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  return (
    <div>
      <PageHeader
        title="Restoranlar"
        subtitle="Platform altında barındırılan tüm kiracılar"
        actions={
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" disabled>
                    <Download className="size-4" />
                    Dışa aktar
                  </Button>
                }
              />
              <TooltipContent>Yakında</TooltipContent>
            </Tooltip>
            <CreateRestaurantDialog />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex-1">
          <FleetFilters
            query={query}
            onQuery={setQuery}
            status={status}
            onStatus={setStatus}
            plan={plan}
            onPlan={setPlan}
            stats={stats}
          />
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          {[
            { id: "list" as const, icon: List, label: "Liste" },
            { id: "grid" as const, icon: LayoutGrid, label: "Izgara" },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={cn(
                "grid size-7 place-items-center rounded-[6px] transition-colors",
                view === id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-2">
          <RestaurantSkeleton />
          <RestaurantSkeleton />
          <RestaurantSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasAny={items.length > 0} query={query} />
      ) : view === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {filtered.map((r) => (
            <FleetCard key={r.id} r={r} />
          ))}
        </div>
      ) : (
        <FleetTable items={filtered} />
      )}

      <Pager
        page={page}
        pageSize={data?.pageSize ?? 20}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  )
}

function EmptyState({ hasAny, query }: { hasAny: boolean; query: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <div className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
        {hasAny ? <Search className="size-5" /> : <Store className="size-5" />}
      </div>
      {hasAny ? (
        <div>
          <p className="text-sm font-medium">Sonuç yok</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {query
              ? `“${query}” ile eşleşen restoran bulunamadı.`
              : "Seçili filtreyle eşleşen restoran yok."}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium">Henüz restoran yok</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            İlk restoranı eklemek için “Yeni restoran”ı kullan.
          </p>
        </div>
      )}
    </div>
  )
}
