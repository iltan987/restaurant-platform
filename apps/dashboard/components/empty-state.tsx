import { cn } from "@repo/ui/lib/utils"

/**
 * Centered empty/zero-state: a soft icon bubble, a title, supporting text, and
 * an optional action row (passed as children — typically one primary button).
 */
export function EmptyState({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-line bg-surface px-6 py-14 text-center shadow-soft",
        className
      )}
    >
      {icon ? (
        <div className="mb-4 grid size-12 place-items-center rounded-xl bg-surface-muted text-ink-3 [&_svg]:size-5.5">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-3">
          {description}
        </p>
      ) : null}
      {children ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {children}
        </div>
      ) : null}
    </div>
  )
}
