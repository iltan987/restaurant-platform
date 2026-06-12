"use client"

import { useQuery } from "@tanstack/react-query"
import { BookOpen, EyeOff } from "lucide-react"

import { type RestaurantWithCounts } from "@repo/schemas"
import { Badge } from "@repo/ui/components/ui/badge"
import { Skeleton } from "@repo/ui/components/ui/skeleton"

import { ComingSoonBadge } from "@/components/console/scaffold-panel"
import { menuQueries } from "@/features/menu/queries"

export function TabMenu({ r }: { r: RestaurantWithCounts }) {
  const { data: categories, isPending } = useQuery(
    menuQueries.categories(r.slug)
  )

  return (
    <div className="max-w-2xl">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[15px] font-semibold">Menü kategorileri</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {r.menuItemCount} ürün
        </span>
        <span className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
          Düzenleme <ComingSoonBadge />
        </span>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : !categories || categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
            <BookOpen className="size-5" />
          </div>
          <p className="text-sm font-medium">Henüz menü yok</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Kategoriler ve ürünler müşteri panelinden eklenir.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0"
            >
              <div className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                <BookOpen className="size-4" />
              </div>
              <span className="flex-1 text-sm font-medium">{c.name}</span>
              {c.isHidden ? (
                <Badge
                  variant="secondary"
                  className="gap-1 text-muted-foreground"
                >
                  <EyeOff className="size-3" />
                  Gizli
                </Badge>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
