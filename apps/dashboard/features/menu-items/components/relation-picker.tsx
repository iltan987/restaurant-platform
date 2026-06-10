"use client"

import { CheckIcon, PlusIcon, XIcon } from "lucide-react"
import { useState } from "react"

import { Input } from "@repo/ui/components/ui/input"
import { cn } from "@repo/ui/lib/utils"

export type PickerOption = { id: string; label: string; deletable: boolean }

/**
 * A wrap of selectable chips with an inline "add" field — used for both the
 * allergen and tag pickers. Selection is controlled by the parent (so it
 * saves with the item); creating/deleting an entry is handled by the wrapper.
 */
export function RelationPicker({
  title,
  options,
  selectedIds,
  onToggle,
  onCreate,
  onDelete,
  creating,
  placeholder,
}: {
  title: string
  options: PickerOption[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onCreate: (label: string) => void
  onDelete: (id: string) => void
  creating: boolean
  placeholder: string
}) {
  const [draft, setDraft] = useState("")

  function add() {
    const value = draft.trim()
    if (!value) return
    onCreate(value)
    setDraft("")
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{title}</span>

      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => {
            const selected = selectedIds.has(o.id)
            return (
              <span key={o.id} className="inline-flex items-center">
                <button
                  type="button"
                  onClick={() => onToggle(o.id)}
                  aria-pressed={selected}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted",
                    o.deletable && "rounded-r-none"
                  )}
                >
                  {selected && <CheckIcon className="size-3" />}
                  {o.label}
                </button>
                {o.deletable && (
                  <button
                    type="button"
                    aria-label={`${o.label} sil`}
                    onClick={() => onDelete(o.id)}
                    className="grid h-[26px] place-items-center rounded-r-full border border-l-0 px-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <XIcon className="size-3" />
                  </button>
                )}
              </span>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          maxLength={60}
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
        />
        <button
          type="button"
          aria-label="Ekle"
          disabled={!draft.trim() || creating}
          onClick={add}
          className="grid size-8 shrink-0 place-items-center rounded-md border text-primary disabled:opacity-40"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}
