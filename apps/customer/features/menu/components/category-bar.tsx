import { useEffect, useRef } from "react"

import { type MenuTreeCategory } from "@repo/schemas"
import { cn } from "@repo/ui/lib/utils"

/**
 * Horizontal, sticky category rail with scroll-spy. The active chip is filled
 * with the accent; the rail keeps it scrolled into view as the page scrolls.
 */
export function CategoryBar({
  categories,
  activeId,
  onPick,
}: {
  categories: MenuTreeCategory[]
  activeId: string
  onPick: (id: string) => void
}) {
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const rail = railRef.current
    const chip = rail?.querySelector<HTMLElement>(`[data-cat="${activeId}"]`)
    if (!rail || !chip) return
    const r = chip.getBoundingClientRect()
    const pr = rail.getBoundingClientRect()
    if (r.left < pr.left + 12 || r.right > pr.right - 12) {
      rail.scrollTo({ left: chip.offsetLeft - 16, behavior: "smooth" })
    }
  }, [activeId])

  return (
    <div className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur-md backdrop-saturate-150">
      <div
        ref={railRef}
        className="menu-scroll flex items-center gap-1.5 overflow-x-auto px-4 py-2.5"
      >
        {categories.map((c) => {
          const active = c.id === activeId
          return (
            <button
              key={c.id}
              type="button"
              data-cat={c.id}
              onClick={() => onPick(c.id)}
              className={cn(
                "inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-secondary-foreground active:bg-muted"
              )}
            >
              {c.name}
              <span className="font-mono text-[11px] font-semibold opacity-70">
                {c.items.length}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
