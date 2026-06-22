import { cn } from "@repo/ui/lib/utils"

/**
 * A labelled form field: label (+ optional required mark), the control, and an
 * error or hint line below. Mirrors the design's `.field` pattern and pairs
 * with the shadcn Input/Textarea/Select without modifying them.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label?: React.ReactNode
  htmlFor?: string
  hint?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  )
}

/** A grouped section inside an editor: subtle top divider + small caps label. */
export function EditorSection({
  title,
  meta,
  className,
  children,
}: {
  title?: React.ReactNode
  meta?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 border-t border-line-subtle pt-5",
        className
      )}
    >
      {title ? (
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {meta ? <span className="text-xs text-ink-3">{meta}</span> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
