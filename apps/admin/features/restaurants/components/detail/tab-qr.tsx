"use client"

import { useQuery } from "@tanstack/react-query"
import { Download, Info, Printer, QrCode } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

import { type RestaurantWithCounts } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import { Skeleton } from "@repo/ui/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/ui/tooltip"

import { tablesQueries } from "@/features/tables/queries"
import { tableMenuUrl } from "@/lib/domain"

export function TabQr({ r }: { r: RestaurantWithCounts }) {
  const { data: tables, isPending } = useQuery(tablesQueries.bySlug(r.slug))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-semibold">QR kodları</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {r.tableCount} masa
        </span>
        <div className="ml-auto flex gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="outline" size="sm" disabled>
                  <Printer className="size-3.5" />
                  Tümünü bas
                </Button>
              }
            />
            <TooltipContent>Yakında</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="outline" size="sm" disabled>
                  <Download className="size-3.5" />
                  PDF indir
                </Button>
              }
            />
            <TooltipContent>Yakında</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : !tables || tables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
            <QrCode className="size-5" />
          </div>
          <p className="text-sm font-medium">QR kodları masalardan üretilir</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Önce kat planında masa ekle; her masa için QR otomatik oluşur.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-[13px] leading-relaxed">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Her QR, masaya özel adrese yönlendirir ve masa kimliğine bağlıdır
              — masayı yeniden adlandırmak adresi değiştirmez.
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {tables.map((t) => {
              const url = tableMenuUrl(r.slug, t.id)
              return (
                <div
                  key={t.id}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-center"
                >
                  <div className="rounded-lg bg-white p-2">
                    <QRCodeSVG value={url} size={92} marginSize={0} level="M" />
                  </div>
                  <div className="text-sm font-medium">{t.label}</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
