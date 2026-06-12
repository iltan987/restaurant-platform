import { Sparkles } from "lucide-react"

import { Badge } from "@repo/ui/components/ui/badge"
import { cn } from "@repo/ui/lib/utils"

/** Small "yakında" marker for features that are designed but not yet wired. */
export function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn("font-medium text-muted-foreground", className)}
    >
      Yakında
    </Badge>
  )
}

/**
 * Placeholder for a feature whose UI shape is decided but whose backend isn't
 * built yet (billing, owner hand-off, activity log, …). Honest about the state
 * while keeping the screen present so it's ready to fill in next.
 */
export function ScaffoldPanel({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description?: string
  icon?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
      <div className="grid size-11 place-items-center rounded-xl bg-background text-muted-foreground shadow-sm">
        {icon ?? <Sparkles className="size-5" />}
      </div>
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <ComingSoonBadge />
      </div>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </div>
  )
}
