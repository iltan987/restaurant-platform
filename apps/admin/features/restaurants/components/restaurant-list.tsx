"use client"

import { useQuery } from "@tanstack/react-query"
import { UtensilsIcon } from "lucide-react"
import { restaurantsQueries } from "../queries"
import { RestaurantRow } from "./restaurant-row"
import { RestaurantSkeleton } from "./restaurant-skeleton"

export function RestaurantList() {
  const { data: restaurants, isPending: isLoading } = useQuery(
    restaurantsQueries.list()
  )

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium">Restoranlar</h2>
        {!isLoading && restaurants !== undefined && (
          <span className="text-xs text-muted-foreground">
            {restaurants.length} kayıt
          </span>
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
    </>
  )
}
