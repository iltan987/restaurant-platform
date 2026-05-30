import { UtensilsIcon } from "lucide-react"
import { type Restaurant } from "@repo/schemas"
import { RestaurantRow } from "./restaurant-row"
import { RestaurantSkeleton } from "./restaurant-skeleton"

interface Props {
  restaurants: Restaurant[] | undefined
  isLoading: boolean
}

export function RestaurantList({ restaurants, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <RestaurantSkeleton />
        <RestaurantSkeleton />
        <RestaurantSkeleton />
      </div>
    )
  }

  if (!restaurants || restaurants.length === 0) {
    return (
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
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {restaurants.map((r) => (
        <RestaurantRow key={r.id} restaurant={r} />
      ))}
    </div>
  )
}
