import { Separator } from "@repo/ui/components/ui/separator"
import { RestaurantForm } from "./restaurant-form"
import { RestaurantList } from "./restaurant-list"

export function RestaurantManager() {
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
          <RestaurantList />
        </section>
      </div>
    </div>
  )
}
