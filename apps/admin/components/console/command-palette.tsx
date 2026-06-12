"use client"

import { useQuery } from "@tanstack/react-query"
import { Activity, LayoutGrid, Store } from "lucide-react"
import { useRouter } from "next/navigation"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@repo/ui/components/ui/command"

import { restaurantsQueries } from "@/features/restaurants/queries"
import { rootDomain, TENANT_MODE, tenantDisplay } from "@/lib/domain"

const PAGES = [
  { href: "/", label: "Genel Bakış", icon: LayoutGrid },
  { href: "/restoranlar", label: "Restoranlar", icon: Store },
  { href: "/etkinlik", label: "Etkinlik", icon: Activity },
]

/**
 * ⌘K palette. Searches the loaded fleet page client-side and jumps to a
 * restaurant or a console page. (Server-side search over the whole fleet is a
 * later addition — for now it scopes to what's loaded.)
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { data } = useQuery({ ...restaurantsQueries.list(), enabled: open })
  const root = rootDomain()

  function go(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Komut paleti"
      description="Restoran veya sayfa ara"
    >
      <CommandInput placeholder="Restoran, slug veya sayfa ara…" />
      <CommandList>
        <CommandEmpty>Sonuç yok.</CommandEmpty>
        <CommandGroup heading="Sayfalar">
          {PAGES.map((p) => (
            <CommandItem
              key={p.href}
              value={`sayfa ${p.label}`}
              onSelect={() => go(p.href)}
            >
              <p.icon />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {data && data.items.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Restoranlar">
              {data.items.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.name} ${r.slug}`}
                  onSelect={() => go(`/restoranlar/${r.slug}`)}
                >
                  <Store />
                  <span className="flex-1">{r.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {TENANT_MODE === "path"
                      ? tenantDisplay(r.slug)
                      : `${r.slug}.${root}`}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}
