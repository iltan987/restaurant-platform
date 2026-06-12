import { cn } from "@repo/ui/lib/utils"

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-xs",
        className
      )}
    >
      {children}
    </div>
  )
}

export function PanelHeader({
  title,
  actions,
}: {
  title: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
      <h3 className="text-[13.5px] font-semibold">{title}</h3>
      {actions}
    </div>
  )
}

export function PanelBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("p-4", className)}>{children}</div>
}
