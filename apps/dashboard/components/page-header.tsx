import { cn } from "@repo/ui/lib/utils"

/** Page title block: large heading, optional subtitle, and a right-aligned action slot. */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("mb-6 flex items-start justify-between gap-5", className)}
    >
      <div className="min-w-0">
        <h1 className="truncate text-[26px] font-[650] tracking-tight text-ink">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-ink-3">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2.5">{actions}</div>
      ) : null}
    </div>
  )
}

/** Smaller in-page section heading: title + optional count/sub + action slot. */
export function SectionHeader({
  title,
  meta,
  actions,
  className,
}: {
  title: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {meta ? (
        <span className="font-mono text-[13px] text-ink-3">{meta}</span>
      ) : null}
      {actions ? (
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
