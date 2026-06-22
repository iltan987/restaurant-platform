import { Badge } from "@repo/ui/components/ui/badge"
import { cn } from "@repo/ui/lib/utils"

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand"

const toneClasses: Record<Tone, string> = {
  neutral: "border-transparent bg-surface-muted text-ink-3",
  success: "border-success/25 bg-success-soft text-success",
  warning: "border-warning/25 bg-warning-soft text-warning",
  danger: "border-danger/25 bg-danger-soft text-danger",
  info: "border-info/25 bg-info-soft text-info",
  brand: "border-brand/25 bg-brand-soft text-brand",
}

/**
 * Soft, tonal status pill built on top of the shared Badge — adds a colored
 * background/text tone and an optional leading dot. Wraps the shadcn Badge
 * rather than modifying it.
 */
export function ToneBadge({
  tone = "neutral",
  dot = false,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Badge>, "variant"> & {
  tone?: Tone
  dot?: boolean
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5", toneClasses[tone], className)}
      {...props}
    >
      {dot ? (
        <span className="size-1.5 shrink-0 rounded-full bg-current" />
      ) : null}
      {children}
    </Badge>
  )
}
