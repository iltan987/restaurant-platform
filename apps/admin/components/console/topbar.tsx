"use client"

import { Bell, LogOut, Plus, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { ThemeToggle } from "@repo/ui/components/theme-toggle"
import { Button } from "@repo/ui/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/ui/tooltip"

import { signOut } from "@/lib/auth-client"

import { CommandPalette } from "./command-palette"

/**
 * Console top bar: ⌘K search palette, notifications (scaffold), theme toggle,
 * and the primary "new restaurant" action (the create dialog lives on the
 * fleet page, so this links there).
 */
export function Topbar() {
  const [cmdOpen, setCmdOpen] = useState(false)
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push("/sign-in")
    router.refresh()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCmdOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <button
        type="button"
        onClick={() => setCmdOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2.5 rounded-md border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
      >
        <Search className="size-[15px]" />
        <span className="truncate">Restoran, slug veya sayfa ara…</span>
        <kbd className="ml-auto rounded border border-border px-1.5 font-mono text-[11px]">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Bildirimler">
                <Bell className="size-[18px]" />
              </Button>
            }
          />
          <TooltipContent>Bildirimler · yakında</TooltipContent>
        </Tooltip>

        <ThemeToggle />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Çıkış yap"
                onClick={handleSignOut}
              >
                <LogOut className="size-[18px]" />
              </Button>
            }
          />
          <TooltipContent>Çıkış yap</TooltipContent>
        </Tooltip>

        <Button nativeButton={false} render={<Link href="/restoranlar" />}>
          <Plus className="size-4" />
          Yeni restoran
        </Button>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </header>
  )
}
