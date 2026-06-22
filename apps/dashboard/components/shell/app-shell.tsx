"use client"

import { useQuery } from "@tanstack/react-query"
import { Menu } from "lucide-react"
import { useState } from "react"

import { ThemeToggle } from "@repo/ui/components/theme-toggle"
import { Button } from "@repo/ui/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@repo/ui/components/ui/drawer"

import { ToneBadge } from "@/components/tone-badge"
import { restaurantsQueries } from "@/features/restaurants/queries"

import { SidebarInner } from "./sidebar"

/**
 * Persistent dashboard chrome: a fixed sidebar on desktop, a slide-in drawer on
 * mobile, and a slim topbar. Wraps every post-setup tenant route so Menu / Plan
 * / QR are reachable by clicking rather than by typing a URL.
 */
export function AppShell({
  slug,
  children,
}: {
  slug: string
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: restaurant } = useQuery(restaurantsQueries.detail(slug))
  const live = restaurant?.status === "ACTIVE"

  return (
    <div className="flex h-svh overflow-hidden bg-canvas text-ink">
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-line bg-surface-subtle lg:flex">
        <SidebarInner slug={slug} />
      </aside>

      <Drawer direction="left" open={mobileOpen} onOpenChange={setMobileOpen}>
        <DrawerContent className="w-[272px] border-line bg-surface-subtle p-0">
          <DrawerTitle className="sr-only">Gezinme</DrawerTitle>
          <SidebarInner slug={slug} onNavigate={() => setMobileOpen(false)} />
        </DrawerContent>
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur lg:px-7">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-1 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu className="size-5" />
          </Button>
          <span className="truncate text-sm font-semibold text-ink lg:hidden">
            {restaurant?.name}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {restaurant ? (
              <ToneBadge tone={live ? "success" : "neutral"} dot>
                {live ? "Yayında" : "Pasif"}
              </ToneBadge>
            ) : null}
            <ThemeToggle className="text-ink-3" />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
