import { type RestaurantWithCounts } from "@repo/schemas"
import { cn } from "@repo/ui/lib/utils"

import { setupProgress } from "../lib/derive"

/** Compact setup progress (filled bar + n/total), used in fleet rows/cards. */
export function SetupProgressMini({ r }: { r: RestaurantWithCounts }) {
  const { done, total, pct } = setupProgress(r)
  const complete = done === total

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            complete ? "bg-emerald-500" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
        {done}/{total}
      </span>
    </div>
  )
}
