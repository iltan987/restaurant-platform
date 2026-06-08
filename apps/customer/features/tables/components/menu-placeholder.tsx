import { UtensilsCrossedIcon } from "lucide-react"

import { type Restaurant, type Table } from "@repo/schemas"

/**
 * Placeholder menu for a valid table on a live restaurant. The real menu lands
 * in a later story — for now this confirms the QR → table → menu path works.
 */
export function MenuPlaceholder({
  restaurant,
  table,
}: {
  restaurant: Restaurant
  table: Table
}) {
  return (
    <div className="mx-auto min-h-svh max-w-md px-5 pb-16">
      <header className="sticky top-0 -mx-5 mb-8 border-b bg-background/80 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <h1 className="truncate text-base font-semibold tracking-tight">
            {restaurant.name}
          </h1>
          <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Masa {table.label}
          </span>
        </div>
      </header>

      <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed bg-muted/30 px-6 py-14 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-background text-muted-foreground shadow-sm">
          <UtensilsCrossedIcon className="size-7" />
        </span>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Menü çok yakında
          </h2>
          <p className="text-sm text-pretty text-muted-foreground">
            Bu masanın menüsü hazırlanıyor. QR kodunuz çalışıyor — menü
            yayınlandığında burada görünecek.
          </p>
        </div>
      </div>
    </div>
  )
}
