"use client"

import { useQuery } from "@tanstack/react-query"
import { PrinterIcon, QrCodeIcon } from "lucide-react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"

import { type Area, type Restaurant, type Table } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
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
    <div className="mx-auto w-full max-w-[1080px] px-4 py-7 pb-20 sm:px-7 print:max-w-none print:p-0">
      <div className="print:hidden">
        <PageHeader
          title="QR Kodları"
          subtitle={
            cells.length > 0
              ? `${cells.length} masa · yazdırıp masalara yerleştirin`
              : "Her masa için yazdırılabilir QR kodu."
          }
          actions={
            <Button
              onClick={() => window.print()}
              disabled={cells.length === 0}
            >
              <PrinterIcon className="size-4" />
              Tümünü yazdır
            </Button>
          }
        />
      </div>

      {cells.length === 0 ? (
        <EmptyState
          className="print:hidden"
          icon={<QrCodeIcon />}
          title="Henüz QR kodu yok"
          description="QR kodları otomatik oluşur. Önce masalarınızı ekleyin."
        >
          <Button nativeButton={false} render={<Link href="/" />}>
            Masaları yönet
          </Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-3">
          {cells.map(({ table, area }) => (
            <div
              key={table.id}
              className="flex break-inside-avoid flex-col items-center gap-2 rounded-card border border-line bg-surface p-4 text-center shadow-soft print:rounded-none print:border-foreground/20 print:shadow-none"
            >
              <div className="rounded-lg bg-white p-2 ring-1 ring-foreground/10 print:ring-0">
                <QRCodeSVG
                  value={tableQrUrl(slug, table.id)}
                  size={148}
                  marginSize={2}
                  level="M"
                />
              </div>
              <div className="text-lg font-semibold tracking-tight text-ink">
                {table.label}
              </div>
              <div className="text-xs text-ink-3">
                {area.name}
                {isMulti && floorName(area.floorId)
                  ? ` · ${floorName(area.floorId)}`
                  : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
