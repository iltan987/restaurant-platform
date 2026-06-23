"use client"

import { PlusIcon } from "lucide-react"

/** Dashed "quick add" chips for common floor/area names. */
export function SuggestionChips({
  suggestions,
  onPick,
}: {
  suggestions: string[]
  onPick: (value: string) => void
}) {
  if (suggestions.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onPick(name)}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-sm font-medium text-ink-3 transition hover:border-brand hover:bg-brand-soft hover:text-brand"
        >
          <PlusIcon className="size-3.5 opacity-60" />
          {name}
        </button>
      ))}
    </div>
  )
}
