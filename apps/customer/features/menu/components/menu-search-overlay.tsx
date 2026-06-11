"use client"

import { SearchIcon, XIcon } from "lucide-react"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"

import { searchMenu } from "@repo/core"
import { type MenuTreeCategory, type MenuTreeItem } from "@repo/schemas"
import { cn } from "@repo/ui/lib/utils"

import { ItemCard } from "./item-card"

const SUGGESTIONS = [
  "Kebap",
  "vegan",
  "Tatlılar",
  "acılı",
  "çorba",
  "İçecekler",
]

/** Highlights the first case-insensitive (tr) match of `q` within `text`. */
function highlight(text: string, q: string): ReactNode {
  const query = q.trim()
  if (!query) return text
  const i = text.toLocaleLowerCase("tr").indexOf(query.toLocaleLowerCase("tr"))
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[3px] bg-[oklch(0.92_0.1_80)] px-px font-semibold text-foreground dark:bg-[oklch(0.62_0.13_78/0.32)]">
        {text.slice(i, i + query.length)}
      </mark>
      {text.slice(i + query.length)}
    </>
  )
}

/**
 * Full-screen search overlay. Filters the already-loaded menu tree in memory
 * (Turkish-aware) via `searchMenu` — no network — and groups hits by category.
 */
export function MenuSearchOverlay({
  categories,
  onClose,
  onOpen,
}: {
  categories: MenuTreeCategory[]
  onClose: () => void
  onOpen: (item: MenuTreeItem) => void
}) {
  const [q, setQ] = useState("")
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  const results = useMemo(
    () => (q.trim() ? searchMenu(categories, q) : null),
    [categories, q]
  )
  const total = results?.reduce((n, c) => n + c.items.length, 0) ?? 0

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <div className="flex items-center gap-2.5 border-b border-border/60 bg-card px-3.5 py-3">
        <div
          className={cn(
            "flex h-11 flex-1 items-center gap-2.5 rounded-full border px-3.5 transition-colors",
            focused
              ? "border-primary bg-card ring-[3px] ring-[var(--accent-ring,oklch(0.62_0.155_41/0.3))]"
              : "border-transparent bg-muted"
          )}
        >
          <SearchIcon className="size-[18px] text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Menüde ara…"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--text-faint)]"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Temizle"
              className="grid size-6 place-items-center text-muted-foreground"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-1 text-[14.5px] font-semibold text-[var(--accent-text)]"
        >
          İptal
        </button>
      </div>

      <div className="menu-scroll flex-1 overflow-y-auto">
        {!q && (
          <div className="p-[18px]">
            <div className="mb-3 text-xs font-bold tracking-[0.06em] text-[var(--text-faint)] uppercase">
              Popüler aramalar
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQ(s)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[13.5px] font-semibold text-secondary-foreground"
                >
                  <SearchIcon className="size-3.5" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {q && total === 0 && (
          <div className="flex flex-col items-center gap-1.5 px-9 py-14 text-center">
            <div className="mb-3 grid size-16 place-items-center rounded-[20px] border border-border bg-card text-primary shadow-sm">
              <SearchIcon className="size-6" />
            </div>
            <div className="text-lg font-bold">Sonuç bulunamadı</div>
            <p className="max-w-[280px] text-sm text-pretty text-muted-foreground">
              “{q}” için eşleşme yok. Yazımı kontrol edin ya da farklı bir terim
              deneyin.
            </p>
          </div>
        )}

        {results && total > 0 && (
          <div className="pb-6">
            <div className="px-[18px] pt-3 text-[12.5px] text-muted-foreground">
              {total} sonuç
            </div>
            {results.map((c) => (
              <div key={c.id}>
                <div className="px-[18px] pt-4 pb-1.5 text-xs font-bold tracking-[0.05em] text-[var(--text-faint)] uppercase">
                  {highlight(c.name, q)}
                </div>
                <div className="flex flex-col">
                  {c.items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onOpen={onOpen}
                      nameSlot={highlight(item.name, q)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
