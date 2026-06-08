import { ClockIcon, QrCodeIcon } from "lucide-react"

import { type Restaurant } from "@repo/schemas"

/** Mobile-first centered shell shared by every storefront state. */
export function StorefrontShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col items-center justify-center gap-7 px-6 py-12 text-center">
      {children}
    </main>
  )
}

function Mark({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "R"
  return (
    <span className="grid size-14 place-items-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground shadow-sm">
      {initial}
    </span>
  )
}

/**
 * Tenant root for a live restaurant: nudges the guest to scan the QR on their
 * own table (the storefront only resolves a menu via a table URL).
 */
export function ScanLanding({ restaurant }: { restaurant: Restaurant }) {
  return (
    <StorefrontShell>
      <Mark name={restaurant.name} />
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {restaurant.name}
        </h1>
        <p className="text-pretty text-muted-foreground">
          Menüyü görmek için masanızdaki QR kodu telefon kameranızla okutun.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
        <QrCodeIcon className="size-4" />
        Masadaki QR kodu okutun
      </div>
    </StorefrontShell>
  )
}

/**
 * Shown when the restaurant isn't live (or the table/slug doesn't resolve).
 * Deliberately vague — guests shouldn't see a menu for an inactive venue.
 */
export function NotAvailable({ name }: { name?: string }) {
  return (
    <StorefrontShell>
      <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <ClockIcon className="size-7" />
      </span>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">
          Menü şu anda kullanılamıyor
        </h1>
        <p className="text-pretty text-muted-foreground">
          {name ? `${name} ` : "Bu restoran "}şu anda sipariş almıyor. Lütfen
          daha sonra tekrar deneyin.
        </p>
      </div>
    </StorefrontShell>
  )
}
