import { QrCodeIcon } from "lucide-react"

import { StorefrontShell } from "@/features/restaurants/components/storefront"

/**
 * Apex root (no tenant subdomain). There's no restaurant context here, so we
 * simply explain how the storefront is reached: by scanning a table's QR.
 */
export default function Home() {
  return (
    <StorefrontShell>
      <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <QrCodeIcon className="size-7" />
      </span>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">
          Menünüz bir QR uzakta
        </h1>
        <p className="text-pretty text-muted-foreground">
          Restoranınızdaki masada yer alan QR kodu telefon kameranızla okutarak
          menüye ulaşabilirsiniz.
        </p>
      </div>
    </StorefrontShell>
  )
}
