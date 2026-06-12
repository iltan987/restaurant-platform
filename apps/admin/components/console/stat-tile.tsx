import { type LucideIcon } from "lucide-react"

import { cn } from "@repo/ui/lib/utils"

import { ComingSoonBadge } from "./scaffold-panel"

const TONES = {
  default: "bg-primary/10 text-primary",
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  muted: "bg-muted text-muted-foreground",
} as const

/** A single dashboard metric tile. `comingSoon` dims it for unbacked metrics. */
export function StatTile({
  icon: Icon,
  value,
  label,
  hint,
  tone = "default",
  comingSoon,
}: {
  icon: LucideIcon
  value: React.ReactNode
  label: string
  hint?: string
  tone?: keyof typeof TONES
  comingSoon?: boolean
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "grid size-9 place-items-center rounded-lg",
            TONES[tone]
          )}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </div>
        {comingSoon ? (
          <ComingSoonBadge />
        ) : hint ? (
          <span className="text-[11px] font-medium text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
      <div>
        <div className="font-mono text-[28px] leading-none font-semibold tracking-tight tabular-nums">
          {value}
        </div>
        <div className="mt-1.5 text-[13px] text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}
