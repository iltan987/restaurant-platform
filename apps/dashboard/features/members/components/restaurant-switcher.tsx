"use client"

import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown } from "lucide-react"

import { Button } from "@repo/ui/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu"
import { cn } from "@repo/ui/lib/utils"

import { restaurantHref } from "@/lib/me"

import { membersQueries } from "../queries"

/**
 * Switch between the restaurants the signed-in user belongs to (US3). Renders
 * nothing for single-restaurant users; otherwise a dropdown that navigates to
 * each restaurant's dashboard (honouring subdomain/path tenancy). Each target
 * is independently guarded server-side, so there is no cross-restaurant leak.
 */
export function RestaurantSwitcher({ currentSlug }: { currentSlug: string }) {
  const { data: memberships } = useQuery(membersQueries.memberships())

  if (!memberships || memberships.length <= 1) return null

  const current = memberships.find((m) => m.slug === currentSlug)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
          >
            {current?.name ?? "Restoran seç"}
            <ChevronsUpDown className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuLabel>Restoranlarınız</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((m) => {
          const active = m.slug === currentSlug
          return (
            <DropdownMenuItem
              key={m.restaurantId}
              disabled={active}
              render={<a href={restaurantHref(m.slug)} />}
            >
              <Check
                className={cn("size-4", active ? "opacity-100" : "opacity-0")}
              />
              <span className="truncate">{m.name}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
