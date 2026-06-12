import { cn } from "@repo/ui/lib/utils"

/**
 * Small "control plane" indicator in the sidebar. The console always talks to a
 * single environment; this just makes that explicit, the way the design does.
 */
export function EnvChip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-2.5 py-1",
        "font-mono text-[11px] font-medium text-muted-foreground",
        className
      )}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
      </span>
      production · tüm bölgeler
    </div>
  )
}
