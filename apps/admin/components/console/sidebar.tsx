"use client"

import { LayoutGrid, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/ui/tooltip"
import { cn } from "@repo/ui/lib/utils"

import { EnvChip } from "./env-chip"
import { NAV_SECTIONS, type NavItem } from "./nav-config"

function isActive(pathname: string, item: NavItem): boolean {
  if (item.disabled) return false
  if (item.matchPrefix) return pathname.startsWith(item.matchPrefix)
  return pathname === item.href
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item)
  const Icon = item.icon

  const base =
    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors"

  if (item.disabled) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              aria-disabled
              className={cn(
                base,
                "cursor-default text-muted-foreground/50 select-none"
              )}
            >
              <Icon className="size-[17px]" strokeWidth={1.75} />
              <span className="flex-1">{item.label}</span>
            </span>
          }
        />
        <TooltipContent side="right">Yakında</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        base,
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      <Icon
        className={cn("size-[17px]", active && "text-sidebar-primary")}
        strokeWidth={1.75}
      />
      <span>{item.label}</span>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 hidden h-svh flex-col border-r border-sidebar-border bg-sidebar md:flex">
      {/* Brand — the product has no name yet, so this is a neutral wordmark. */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-3">
        <div className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
          <LayoutGrid className="size-4" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Konsol</span>
      </div>

      <EnvChip className="mx-4 mb-3" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-2">
            <div className="px-2.5 pt-3 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              {section.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavLink key={item.label} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer — placeholder until auth lands (no user model yet). */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <User className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium">Geliştirici</div>
            <div className="truncate text-[11px] text-muted-foreground">
              Konsol kullanıcısı
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
