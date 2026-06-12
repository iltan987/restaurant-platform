import { cn } from "@repo/ui/lib/utils"

/**
 * The console's restaurant lifecycle, derived from the backend's
 * status/onboarding fields (see features/restaurants/lib/derive). "suspended"
 * has no backend yet and is reserved for the billing work.
 */
export type ConsoleStatus = "live" | "setup" | "draft" | "suspended"

const META: Record<
  ConsoleStatus,
  { label: string; dot: string; className: string }
> = {
  live: {
    label: "Yayında",
    dot: "bg-emerald-500",
    className:
      "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  setup: {
    label: "Kurulumda",
    dot: "bg-amber-500",
    className:
      "border-amber-600/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  draft: {
    label: "Taslak",
    dot: "bg-muted-foreground/50",
    className: "border-border bg-muted text-muted-foreground",
  },
  suspended: {
    label: "Askıda",
    dot: "bg-destructive",
    className:
      "border-destructive/20 bg-destructive/10 text-destructive dark:text-red-400",
  },
}

export function StatusPill({
  status,
  className,
}: {
  status: ConsoleStatus
  className?: string
}) {
  const meta = META[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        meta.className,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  )
}
