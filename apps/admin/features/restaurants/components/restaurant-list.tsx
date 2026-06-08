"use client"

import { useQuery } from "@tanstack/react-query"
import { UtensilsIcon } from "lucide-react"
import { useState } from "react"

import { restaurantsQueries } from "../queries"
import { Pager } from "./pager"
import { RestaurantRow } from "./restaurant-row"
import { RestaurantSkeleton } from "./restaurant-skeleton"

export function RestaurantList() {
  const [page, setPage] = useState(1)
  const { data, isPending: isLoading } = useQuery(restaurantsQueries.list(page))

  const restaurants = data?.items
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 20

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium">Restoranlar</h2>
        {!isLoading && data !== undefined && (
          <span className="text-xs text-muted-foreground">{total} kayıt</span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <RestaurantSkeleton />
          <RestaurantSkeleton />
          <RestaurantSkeleton />
        </div>
      ) : !restaurants || restaurants.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <UtensilsIcon className="size-6 text-muted-foreground/50" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Henüz restoran yok
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              İlk restoranınızı eklemek için formu kullanın.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {restaurants.map((r) => (
            <RestaurantRow key={r.id} restaurant={r} />
          ))}
        </div>
      )}

      <Pager
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
      />
    </>
  )
}
