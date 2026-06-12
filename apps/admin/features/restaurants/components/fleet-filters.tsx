"use client"

import { ChevronDown, Search } from "lucide-react"

import { Button } from "@repo/ui/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/ui/tooltip"
import { cn } from "@repo/ui/lib/utils"

import { type ConsoleStatus } from "@/components/console/status-pill"

import { type FleetStats } from "../lib/derive"

export type StatusFilter = "all" | ConsoleStatus

const CHIPS: { id: StatusFilter; label: string; disabled?: boolean }[] = [
  { id: "all", label: "Tümü" },
  { id: "live", label: "Yayında" },
  { id: "setup", label: "Kurulumda" },
  { id: "draft", label: "Taslak" },
  // No backend "suspended" state yet (lives with the billing work).
  { id: "suspended", label: "Askıda", disabled: true },
]

function count(stats: FleetStats, id: StatusFilter): number {
  return id === "all" ? stats.total : stats[id]
}

export function FleetFilters({
  query,
  onQuery,
  status,
  onStatus,
  stats,
}: {
  query: string
  onQuery: (q: string) => void
  status: StatusFilter
  onStatus: (s: StatusFilter) => void
  stats: FleetStats
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-9 min-w-56 flex-1 items-center gap-2.5 rounded-md border border-border bg-card px-3 text-muted-foreground sm:max-w-sm">
        <Search className="size-4" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Restoran, slug veya şehir ara…"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {CHIPS.map((chip) => {
          const active = status === chip.id
          const n = count(stats, chip.id)

          if (chip.disabled) {
            return (
              <Tooltip key={chip.id}>
                <TooltipTrigger
                  render={
                    <span className="inline-flex h-8 cursor-default items-center gap-1.5 rounded-md border border-border px-2.5 text-[13px] font-medium text-muted-foreground/40 select-none">
                      {chip.label}
                    </span>
                  }
                />
                <TooltipContent>Yakında</TooltipContent>
              </Tooltip>
            )
          }

          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onStatus(chip.id)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium transition-colors",
                active
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {chip.label}
              <span className="font-mono text-[11px] tabular-nums opacity-70">
                {n}
              </span>
            </button>
          )
        })}
      </div>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              disabled
              className="ml-auto h-8"
            >
              Tüm planlar
              <ChevronDown className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>Plan filtresi · yakında</TooltipContent>
      </Tooltip>
    </div>
  )
}
