"use client"

import { useQuery } from "@tanstack/react-query"
import { ChevronLeftIcon, PrinterIcon } from "lucide-react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"

import { type Area, type Restaurant, type Table } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"

import { areasQueries } from "@/features/areas/queries"
import { floorsQueries } from "@/features/floors/queries"

import { tableQrUrl } from "../qr"
import { tablesQueries } from "../queries"

/**
 * Print-all QR sheet. Renders one vector QR (crisp at any print size) per
 * table, paired with its label and area/floor, grouped ground-floor-first to
 * match the setup step. The screen toolbar is hidden in print; each card avoids
 * page breaks so codes never split. Scales to 150+ tables (FR-024/FR-025).
 */
export function QrPrintSheet({ restaurant }: { restaurant: Restaurant }) {
  const slug = restaurant.slug
  const { data: floors = [] } = useQuery(floorsQueries.bySlug(slug))
  const { data: areas = [] } = useQuery(areasQueries.bySlug(slug))
  const { data: tables = [] } = useQuery(tablesQueries.bySlug(slug))

  const isMulti = floors.length > 1
  const floorName = (id: string) => floors.find((f) => f.id === id)?.name

  const floorRank = new Map(floors.map((f, i) => [f.id, i]))
  const orderedAreas = [...areas].sort(
    (a, b) => (floorRank.get(a.floorId) ?? 0) - (floorRank.get(b.floorId) ?? 0)
  )

  const cells: { table: Table; area: Area }[] = orderedAreas.flatMap((area) =>
    tables.filter((t) => t.areaId === area.id).map((table) => ({ table, area }))
  )

  return (
    <div className="min-h-svh bg-background print:bg-white">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-3.5">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            nativeButton={false}
            render={
              <Link href="/">
                <ChevronLeftIcon className="size-4" />
                Geri
              </Link>
            }
          />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">
              {restaurant.name} · QR kodları
            </h1>
            <p className="text-xs text-muted-foreground">
              {cells.length} masa · yazdırıp masalara yerleştirin
            </p>
          </div>
          <Button
            className="ml-auto"
            onClick={() => window.print()}
            disabled={cells.length === 0}
          >
            <PrinterIcon className="size-4" />
            Tümünü yazdır
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
        {cells.length === 0 ? (
          <p className="text-sm text-muted-foreground print:hidden">
            Henüz masa yok. Önce kurulumdan masa ekleyin.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-3">
            {cells.map(({ table, area }) => (
              <div
                key={table.id}
                className="flex break-inside-avoid flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center print:rounded-none print:border-foreground/20"
              >
                <div className="rounded-lg bg-white p-2 ring-1 ring-foreground/10 print:ring-0">
                  <QRCodeSVG
                    value={tableQrUrl(slug, table.id)}
                    size={148}
                    marginSize={2}
                    level="M"
                  />
                </div>
                <div className="text-lg font-semibold tracking-tight">
                  {table.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {area.name}
                  {isMulti && floorName(area.floorId)
                    ? ` · ${floorName(area.floorId)}`
                    : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
