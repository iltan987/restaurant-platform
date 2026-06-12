"use client"

import { Activity } from "lucide-react"

import { type RestaurantWithCounts } from "@repo/schemas"

import { ComingSoonBadge } from "@/components/console/scaffold-panel"
import { isoDate } from "@/lib/format"

/**
 * Per-restaurant audit trail. No audit-log backend yet — we show the one event
 * we can derive (creation) and mark the rest as prepared.
 */
export function TabEtkinlik({ r }: { r: RestaurantWithCounts }) {
  return (
    <div className="max-w-2xl">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[15px] font-semibold">Etkinlik geçmişi</h2>
        <ComingSoonBadge />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Activity className="size-4" />
          </div>
          <div className="flex-1 text-sm">
            Restoran oluşturuldu · slug{" "}
            <span className="font-mono text-xs">{r.slug}</span> ayrıldı
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {isoDate(r.createdAt)}
          </div>
        </div>
        <div className="border-t border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          Kurulum, yayına alma ve restoran içi değişikliklerin tam denetim izi
          yakında burada listelenecek.
        </div>
      </div>
    </div>
  )
}
