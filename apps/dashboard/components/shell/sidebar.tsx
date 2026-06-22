"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Check,
  ChevronsUpDown,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  type LucideIcon,
  MoreVertical,
  QrCode,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu"
import { cn } from "@repo/ui/lib/utils"

import { ToneBadge } from "@/components/tone-badge"
import { PasskeysDialog } from "@/features/account/components/passkeys-dialog"
import { membersQueries } from "@/features/members/queries"
import { restaurantsQueries } from "@/features/restaurants/queries"
import { signOut, useSession } from "@/lib/auth-client"
import { restaurantHref } from "@/lib/me"

/** Two-letter initials from a display name (first + last word, else first two chars). */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts.at(-1)![0]!).toUpperCase()
}

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/menu", label: "Menü", icon: UtensilsCrossed },
  { href: "/plan", label: "Masalar & Alanlar", icon: LayoutGrid },
  { href: "/qr", label: "QR Kodları", icon: QrCode },
]

/** Strip the internal `/s/<slug>` rewrite prefix so active-state matches the
 * browser-relative nav hrefs regardless of how usePathname reports the path. */
function normalizePath(pathname: string): string {
  return pathname.replace(/^\/s\/[^/]+/, "") || "/"
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const here = normalizePath(usePathname())

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      <div className="px-2.5 pt-3 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-ink-4 uppercase">
        Yönetim
      </div>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/"
            ? here === "/"
            : here === href || here.startsWith(href + "/")
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13.5px] font-medium transition-colors",
              active
                ? "bg-surface text-ink shadow-soft ring-1 ring-line-subtle"
                : "text-ink-2 hover:bg-surface-hover hover:text-ink"
            )}
          >
            <Icon
              className={cn(
                "size-[18px] shrink-0",
                active ? "text-brand" : "text-ink-3"
              )}
            />
            {label}
          </Link>
        )
      })}
      <div
        className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13.5px] font-medium text-ink-4"
        aria-disabled
      >
        <ShoppingBag className="size-[18px] shrink-0" />
        Siparişler
        <ToneBadge tone="neutral" className="ml-auto">
          Yakında
        </ToneBadge>
      </div>
    </nav>
  )
}

function RestaurantBadge({ slug }: { slug: string }) {
  const { data: restaurant } = useQuery(restaurantsQueries.detail(slug))
  const { data: memberships } = useQuery(membersQueries.memberships())

  const name = restaurant?.name ?? ""
  const live = restaurant?.status === "ACTIVE"
  const switchable = (memberships?.length ?? 0) > 1

  const inner = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-[13px] font-semibold text-brand">
        {initialsOf(name || "?")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold text-ink">
          {name || "—"}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <span
            className={cn(
              "size-1.5 rounded-full",
              live ? "bg-success" : "bg-ink-4"
            )}
          />
          {live ? "Yayında" : "Pasif"}
        </span>
      </span>
      {switchable ? (
        <ChevronsUpDown className="size-4 shrink-0 text-ink-4" />
      ) : null}
    </>
  )

  if (!switchable) {
    return (
      <div className="flex w-full items-center gap-2.5 rounded-xl p-2">
        {inner}
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-surface-hover aria-expanded:bg-surface-hover"
          />
        }
      >
        {inner}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-60">
        <DropdownMenuLabel>Restoranlarınız</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships!.map((m) => {
          const isCurrent = m.slug === slug
          return (
            <DropdownMenuItem
              key={m.restaurantId}
              disabled={isCurrent}
              render={<a href={restaurantHref(m.slug)} />}
            >
              <Check
                className={cn(
                  "size-4",
                  isCurrent ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="truncate">{m.name}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AccountMenu() {
  const { data: session } = useSession()
  const [passkeysOpen, setPasskeysOpen] = useState(false)

  const user = session?.user
  const name = user?.name || user?.email || "Hesap"
  const email = user?.email ?? ""

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-surface-hover aria-expanded:bg-surface-hover"
            />
          }
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-[12px] font-semibold text-ink-2">
            {initialsOf(name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-ink">
              {name}
            </span>
            {email ? (
              <span className="block truncate text-[11.5px] text-ink-3">
                {email}
              </span>
            ) : null}
          </span>
          <MoreVertical className="size-4 shrink-0 text-ink-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-60">
          <DropdownMenuItem onClick={() => setPasskeysOpen(true)}>
            <KeyRound className="size-4" />
            Geçiş anahtarları
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={async () => {
              await signOut()
              window.location.reload()
            }}
          >
            <LogOut className="size-4" />
            Çıkış yap
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PasskeysDialog
        open={passkeysOpen}
        onOpenChange={setPasskeysOpen}
        showTrigger={false}
      />
    </>
  )
}

/** The full sidebar column — reused by the desktop aside and the mobile drawer. */
export function SidebarInner({
  slug,
  onNavigate,
}: {
  slug: string
  onNavigate?: () => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-3">
        <RestaurantBadge slug={slug} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NavList onNavigate={onNavigate} />
      </div>
      <div className="border-t border-line p-3">
        <AccountMenu />
      </div>
    </div>
  )
}
