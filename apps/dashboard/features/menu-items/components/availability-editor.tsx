"use client"

import { useQuery } from "@tanstack/react-query"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"

import { type DayOfWeek } from "@repo/core"
import { type AvailabilityWindow } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Spinner } from "@repo/ui/components/ui/spinner"
import { cn } from "@repo/ui/lib/utils"

import { menuItemsQueries } from "../queries"
import { useSetAvailability } from "../use-set-availability"

const DAY_LABELS: { value: DayOfWeek; label: string }[] = [
  { value: "MON", label: "Pzt" },
  { value: "TUE", label: "Sal" },
  { value: "WED", label: "Çar" },
  { value: "THU", label: "Per" },
  { value: "FRI", label: "Cum" },
  { value: "SAT", label: "Cmt" },
  { value: "SUN", label: "Paz" },
]

type DraftWindow = { days: DayOfWeek[]; start: string; end: string }

const pad = (n: number) => String(n).padStart(2, "0")
const minutesToTime = (min: number) =>
  `${pad(Math.floor(min / 60))}:${pad(min % 60)}`
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/**
 * Availability editor (US4). Fetches the item detail, then renders the form
 * once windows are loaded so its initial state seeds without an effect.
 */
export function AvailabilityEditor({
  itemId,
  categoryId,
}: {
  itemId: string
  categoryId: string
}) {
  const { data: detail, isLoading } = useQuery(menuItemsQueries.detail(itemId))

  if (isLoading || !detail) {
    return (
      <div className="grid place-items-center py-3">
        <Spinner />
      </div>
    )
  }

  return (
    <AvailabilityForm
      key={itemId}
      itemId={itemId}
      categoryId={categoryId}
      initial={detail.availabilityWindows}
    />
  )
}

function AvailabilityForm({
  itemId,
  categoryId,
  initial,
}: {
  itemId: string
  categoryId: string
  initial: AvailabilityWindow[]
}) {
  const setAvailability = useSetAvailability(categoryId, itemId)
  const [windows, setWindows] = useState<DraftWindow[]>(() =>
    initial.map((w) => ({
      days: w.days,
      start: minutesToTime(w.startMin),
      end: minutesToTime(w.endMin),
    }))
  )

  /** Persist the complete, day-assigned window set (empty days = draft, skipped). */
  function persist(next: DraftWindow[]) {
    setAvailability.mutate(
      next
        .filter((w) => w.days.length > 0)
        .map((w) => ({
          days: w.days,
          startMin: timeToMinutes(w.start),
          endMin: timeToMinutes(w.end),
        }))
    )
  }

  function update(next: DraftWindow[], save = true) {
    setWindows(next)
    if (save) persist(next)
  }

  function addWindow() {
    update([...windows, { days: [], start: "09:00", end: "17:00" }], false)
  }

  function removeWindow(index: number) {
    update(windows.filter((_, i) => i !== index))
  }

  function toggleDay(index: number, day: DayOfWeek) {
    update(
      windows.map((w, i) => {
        if (i !== index) return w
        const days = w.days.includes(day)
          ? w.days.filter((d) => d !== day)
          : [...w.days, day]
        return { ...w, days }
      })
    )
  }

  function setTime(index: number, field: "start" | "end", value: string) {
    setWindows((ws) =>
      ws.map((w, i) => (i === index ? { ...w, [field]: value } : w))
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">Servis saatleri</span>
        <span className="text-xs text-ink-3">
          {windows.length === 0 ? "Her zaman açık" : `${windows.length} aralık`}
        </span>
      </div>

      {windows.map((w, index) => (
        <div
          key={index}
          className="flex flex-col gap-2.5 rounded-card border border-line bg-surface-subtle p-3"
        >
          <div className="flex flex-wrap gap-1.5">
            {DAY_LABELS.map((d) => {
              const on = w.days.includes(d.value)
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(index, d.value)}
                  aria-pressed={on}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-xs font-medium transition",
                    on
                      ? "border-brand bg-brand text-white"
                      : "border-line-strong bg-surface text-ink-2 hover:bg-surface-hover"
                  )}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={w.start}
              aria-label="Başlangıç"
              className="h-9 w-32"
              onChange={(e) => setTime(index, "start", e.target.value)}
              onBlur={() => persist(windows)}
            />
            <span className="text-ink-3">–</span>
            <Input
              type="time"
              value={w.end}
              aria-label="Bitiş"
              className="h-9 w-32"
              onChange={(e) => setTime(index, "end", e.target.value)}
              onBlur={() => persist(windows)}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Aralığı sil"
              className="ml-auto text-ink-3 hover:text-danger"
              onClick={() => removeWindow(index)}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
          {w.end < w.start && (
            <p className="text-xs text-ink-3">
              Gece yarısını geçer (ertesi güne sarkar).
            </p>
          )}
        </div>
      ))}

      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-brand hover:bg-brand-soft hover:text-brand"
        onClick={addWindow}
      >
        <PlusIcon className="size-4" />
        Saat aralığı ekle
      </Button>
    </div>
  )
}
