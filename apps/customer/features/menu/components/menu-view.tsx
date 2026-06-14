"use client"

import { useQuery } from "@tanstack/react-query"
import { UtensilsCrossedIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { type MenuTreeItem } from "@repo/schemas"

import { menuQueries } from "../queries"
import { CategoryBar } from "./category-bar"
import { ItemCard } from "./item-card"
import { ItemDetailSheet } from "./item-detail-sheet"
import { MenuHeader } from "./menu-header"
import { MenuSearchOverlay } from "./menu-search-overlay"

const STICKY_OFFSET = 64

/**
 * The customer menu surface (read-only). Composes the header, sticky scroll-spy
 * category rail, photo item cards, the search overlay, and the item-detail
 * bottom sheet over a `MenuTree`. Warm theme via the `.menu-scope` wrapper.
 *
 * The tree is read via `useQuery` and served from the server-dehydrated cache
 * (see the table menu page), so it's present on first render.
 */
export function MenuView({
  slug,
  tableLabel,
}: {
  slug: string
  tableLabel?: string
}) {
  const { data: tree } = useQuery(menuQueries.tree(slug))
  const categories = useMemo(() => tree?.categories ?? [], [tree])
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "")
  const [searchOpen, setSearchOpen] = useState(false)
  // The sheet stays mounted (Vaul owns its open/close lifecycle so its body
  // cleanup runs); `openItem` is the item it shows, `sheetOpen` toggles it.
  const [openItem, setOpenItem] = useState<MenuTreeItem | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const lockUntil = useRef(0)

  // scroll-spy: the top-most visible section drives the active chip.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (performance.now() < lockUntil.current) return
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          )[0]
        if (top) setActiveId((top.target as HTMLElement).dataset.secid ?? "")
      },
      { rootMargin: "-72px 0px -65% 0px", threshold: 0 }
    )
    Object.values(sectionRefs.current).forEach(
      (el) => el && observer.observe(el)
    )
    return () => observer.disconnect()
  }, [categories])

  const jump = useCallback((id: string) => {
    setActiveId(id)
    lockUntil.current = performance.now() + 700
    const el = sectionRefs.current[id]
    if (el) {
      const top =
        el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET
      window.scrollTo({ top, behavior: "smooth" })
    }
  }, [])

  const openItemCb = useCallback((item: MenuTreeItem) => {
    setOpenItem(item)
    setSheetOpen(true)
  }, [])

  // Hydrated from the server cache, so this is present on first render; the
  // guard satisfies the type and covers an unexpected cache miss.
  if (!tree) return null
  const { restaurant } = tree

  return (
    <div className="menu-scope relative min-h-svh">
      <MenuHeader
        name={restaurant.name}
        tableLabel={tableLabel}
        onSearch={() => setSearchOpen(true)}
      />

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 px-9 py-16 text-center">
          <div className="mb-3 grid size-16 place-items-center rounded-[20px] border border-border bg-card text-primary shadow-sm">
            <UtensilsCrossedIcon className="size-6" />
          </div>
          <div className="text-lg font-bold">Menü hazırlanıyor</div>
          <p className="max-w-[280px] text-sm text-pretty text-muted-foreground">
            Bu restoranın menüsü henüz yayınlanmadı. Lütfen biraz sonra tekrar
            bakın.
          </p>
        </div>
      ) : (
        <>
          <CategoryBar
            categories={categories}
            activeId={activeId}
            onPick={jump}
          />
          {categories.map((cat) => (
            <section
              key={cat.id}
              data-secid={cat.id}
              ref={(el) => {
                sectionRefs.current[cat.id] = el
              }}
              className="scroll-mt-[60px] pt-2 pb-1"
            >
              <div className="flex items-baseline gap-2.5 px-[18px] pt-5.5 pb-2.5">
                <h2 className="font-display text-[22px] font-medium tracking-[-0.01em]">
                  {cat.name}
                </h2>
                <span className="font-mono text-xs text-[var(--text-faint)]">
                  {cat.items.length}
                </span>
              </div>
              <div className="flex flex-col">
                {cat.items.map((item) => (
                  <ItemCard key={item.id} item={item} onOpen={openItemCb} />
                ))}
              </div>
            </section>
          ))}
          <div className="h-[90px]" />
        </>
      )}

      {searchOpen && (
        <MenuSearchOverlay
          categories={categories}
          onClose={() => setSearchOpen(false)}
          onOpen={(item) => {
            setSearchOpen(false)
            setOpenItem(item)
            setSheetOpen(true)
          }}
        />
      )}

      <ItemDetailSheet
        item={openItem}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
