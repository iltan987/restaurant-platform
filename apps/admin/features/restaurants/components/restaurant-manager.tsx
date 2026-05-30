"use client"

import { useQuery } from "@tanstack/react-query"
import { Separator } from "@repo/ui/components/separator"
import { restaurantsQueries } from "../queries"
import { RestaurantForm } from "./restaurant-form"
import { RestaurantList } from "./restaurant-list"

export function RestaurantManager() {
  const { data: restaurants, isPending: isLoadingList } = useQuery(
    restaurantsQueries.list()
  )

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b px-6 py-5">
        <h1 className="text-base font-semibold tracking-tight">
          Restoran Yönetimi
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Platform genelinde tüm restoran ve kafeler
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-10 p-6 lg:flex-row lg:gap-16">
        <section className="w-full shrink-0 lg:w-80">
          <h2 className="mb-4 text-sm font-medium">Yeni Ekle</h2>
          <RestaurantForm />
        </section>

        <Separator orientation="vertical" className="hidden lg:block" />

        <section className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium">Restoranlar</h2>
            {!isLoadingList && restaurants !== undefined && (
              <span className="text-xs text-muted-foreground">
                {restaurants.length} kayıt
              </span>
            )}
          </div>
          <RestaurantList
            restaurants={restaurants}
            isLoading={isLoadingList}
          />
        </section>
      </div>
    </div>
  )
}
