"use client"

import { type ReactNode, useState } from "react"

import { cn } from "@repo/ui/lib/utils"

type EditableRowProps = {
  value: string
  onCommit: (value: string) => void
  ariaLabel: string
  leading?: ReactNode
  trailing?: ReactNode
  action?: ReactNode
  optimistic?: boolean
  maxLength?: number
}

/**
 * A list row whose label is an inline, borderless text field. Commits on blur
 * or Enter (only when changed and non-empty); Escape reverts.
 */
export function EditableRow({
  value,
  onCommit,
  ariaLabel,
  leading,
  trailing,
  action,
  optimistic,
  maxLength = 60,
}: EditableRowProps) {
  const [draft, setDraft] = useState(value)

  function commit() {
    const next = draft.trim()
    if (next && next !== value) onCommit(next)
    else setDraft(value)
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t px-3 py-2 first:border-t-0",
        optimistic && "opacity-50"
      )}
    >
      {leading}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
          if (e.key === "Escape") {
            setDraft(value)
            e.currentTarget.blur()
          }
        }}
        aria-label={ariaLabel}
        maxLength={maxLength}
        className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium outline-none hover:bg-muted/60 focus:border-ring focus:bg-background focus:ring-3 focus:ring-ring/30"
      />
      {trailing}
      {action}
    </div>
  )
}
