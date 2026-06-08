"use client"

import { useQuery } from "@tanstack/react-query"
import {
  LayersIcon,
  LayoutGridIcon,
  MinusIcon,
  PlusIcon,
  PrinterIcon,
  QrCodeIcon,
  XIcon,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import {
  type Area,
  type Floor,
  type Restaurant,
  type Table,
  TABLE_LIMIT_PER_RESTAURANT,
} from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import { Spinner } from "@repo/ui/components/ui/spinner"
import { cn } from "@repo/ui/lib/utils"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { InlineAdd } from "@/components/inline-add"
import { areasQueries } from "@/features/areas/queries"
import { floorsQueries } from "@/features/floors/queries"
import { StepHeader } from "@/features/restaurants/components/step-header"

import { tablesQueries } from "../queries"
import { useBulkCreateTables } from "../use-bulk-create-tables"
import { useCreateTable } from "../use-create-table"
import { useDeleteTable } from "../use-delete-table"
import { QrSheet } from "./qr-sheet"
import { TableEditDialog } from "./table-edit-dialog"

const MAX_TABLES = 200

const clampCount = (n: number) => Math.min(MAX_TABLES, Math.max(1, n || 1))

function CountStepper({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
      <button
        type="button"
        onClick={() => onChange(clampCount(value - 1))}
        aria-label="Azalt"
        className="grid size-9 place-items-center text-muted-foreground transition hover:bg-primary/5 hover:text-primary"
      >
        <MinusIcon className="size-4" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label="Masa sayısı"
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 3)
          onChange(digits === "" ? 1 : Math.min(MAX_TABLES, Number(digits)))
        }}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => onChange(clampCount(value))}
        className="w-12 border-x bg-transparent text-center font-mono text-[15px] leading-9 font-semibold outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(clampCount(value + 1))}
        aria-label="Artır"
        className="grid size-9 place-items-center text-muted-foreground transition hover:bg-primary/5 hover:text-primary"
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  )
}

/** A table chip: click the label to edit (name/capacity/shape/area); × deletes. */
function TableChip({
  slug,
  restaurantName,
  areas,
  floors,
  table,
  onDelete,
}: {
  slug: string
  restaurantName: string
  areas: Area[]
  floors: Floor[]
  table: Table
  onDelete: () => void
}) {
  const optimistic = table.id.startsWith("__optimistic__")
  const areaName = areas.find((a) => a.id === table.areaId)?.name ?? ""

  return (
    <span
      className={cn(
        "group inline-flex items-center gap-1 rounded-md border py-1 pr-1 pl-1 text-sm",
        optimistic && "opacity-50"
      )}
    >
      <TableEditDialog
        slug={slug}
        table={table}
        areas={areas}
        floors={floors}
        trigger={
          <button
            type="button"
            disabled={optimistic}
            aria-label={`${table.label} masasını düzenle`}
            className="rounded px-1.5 py-0.5 font-medium transition hover:bg-muted disabled:hover:bg-transparent"
          >
            {table.label}
          </button>
        }
      />
      {table.capacity ? (
        <span className="text-xs text-muted-foreground">
          · {table.capacity}
        </span>
      ) : null}
      <QrSheet
        slug={slug}
        restaurantName={restaurantName}
        areaName={areaName}
        table={table}
        trigger={
          <button
            type="button"
            disabled={optimistic}
            aria-label={`${table.label} masasının QR kodu`}
            className="grid size-4 place-items-center rounded text-muted-foreground transition hover:text-primary disabled:opacity-40"
          >
            <QrCodeIcon className="size-3.5" />
          </button>
        }
      />
      <ConfirmDialog
        trigger={
          <button
            type="button"
            disabled={optimistic}
            aria-label={`${table.label} masasını sil`}
            className="grid size-4 place-items-center rounded text-muted-foreground transition hover:text-destructive"
          >
            <XIcon className="size-3.5" />
          </button>
        }
        title="Masayı sil"
        description={`"${table.label}" masası kalıcı olarak silinecek.`}
        warning="Bu masanın QR kodu artık çalışmayacak; yeniden yazdırmanız gerekir."
        confirmLabel="Sil"
        destructive
        onConfirm={onDelete}
      />
    </span>
  )
}

function AreaBlock({
  slug,
  restaurantName,
  area,
  areas,
  floors,
  floorLabel,
  tables,
  nextStart,
  remaining,
}: {
  slug: string
  restaurantName: string
  area: Area
  areas: Area[]
  floors: Floor[]
  floorLabel?: string
  tables: Table[]
  nextStart: number
  remaining: number
}) {
  const [count, setCount] = useState(4)
  const bulk = useBulkCreateTables(slug)
  const single = useCreateTable(slug)
  const del = useDeleteTable(slug)
  const seats = tables.reduce((s, t) => s + (t.capacity ?? 0), 0)

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2.5 border-b bg-muted/40 px-4 py-3">
        <span className="text-sm font-semibold">{area.name}</span>
        {floorLabel && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            <LayersIcon className="size-3" />
            {floorLabel}
          </span>
        )}
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {tables.length} masa{seats > 0 ? ` · ${seats} koltuk` : ""}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {tables.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tables.map((t) => (
              <TableChip
                key={t.id}
                slug={slug}
                restaurantName={restaurantName}
                areas={areas}
                floors={floors}
                table={t}
                onDelete={() => del.mutate(t.id)}
              />
            ))}
          </div>
        )}

        {remaining <= 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            Masa sınırına ulaşıldı (en fazla {TABLE_LIMIT_PER_RESTAURANT}). Yeni
            masa eklemek için önce mevcut masaları kaldırın.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Toplu ekle
                </span>
                <CountStepper value={count} onChange={setCount} />
              </div>
              <Button
                variant="secondary"
                disabled={bulk.isPending || count > remaining}
                onClick={() =>
                  bulk.mutate({
                    areaId: area.id,
                    input: {
                      count,
                      startNumber: nextStart,
                      ...(area.code ? { labelPrefix: area.code } : {}),
                    },
                  })
                }
              >
                {bulk.isPending ? <Spinner className="size-3.5" /> : null}
                {count} masa oluştur
              </Button>
              <span className="pb-2 font-mono text-xs text-muted-foreground">
                Sonraki: {area.code ?? ""}
                {nextStart}
              </span>
            </div>

            {count > remaining && (
              <p className="-mt-2 text-xs text-destructive">
                Yalnızca {remaining} masa daha eklenebilir.
              </p>
            )}

            <InlineAdd
              placeholder="Özel adlı masa ekle (örn. A3)…"
              pending={single.isPending}
              maxLength={40}
              onAdd={(label) =>
                single.mutate({ areaId: area.id, input: { label } })
              }
            />
          </>
        )}
      </div>
    </div>
  )
}

export function TablesStep({
  restaurant,
  embedded = false,
}: {
  restaurant: Restaurant
  embedded?: boolean
}) {
  const slug = restaurant.slug
  const { data: floors = [] } = useQuery(floorsQueries.bySlug(slug))
  const { data: areas = [] } = useQuery(areasQueries.bySlug(slug))
  const { data: tables = [] } = useQuery(tablesQueries.bySlug(slug))

  const isMulti = floors.length > 1
  const floorName = (id: string) => floors.find((f) => f.id === id)?.name
  const tablesOf = (areaId: string) => tables.filter((t) => t.areaId === areaId)
  const areaFloor = (areaId: string) =>
    areas.find((a) => a.id === areaId)?.floorId
  const totalSeats = tables.reduce((s, t) => s + (t.capacity ?? 0), 0)
  const remaining = Math.max(0, TABLE_LIMIT_PER_RESTAURANT - tables.length)

  // Areas come back ordered only by their own position, so cards from different
  // floors interleave. Group them by floor order (ground floor first) — matching
  // the areas step — keeping the per-floor area order as the tiebreak.
  const floorRank = new Map(floors.map((f, i) => [f.id, i]))
  const orderedAreas = [...areas].sort(
    (a, b) => (floorRank.get(a.floorId) ?? 0) - (floorRank.get(b.floorId) ?? 0)
  )

  // Labels are unique per floor. Bulk-add continues from the highest number
  // already used on that floor for the area's prefix: plain-numbered areas on a
  // floor share one sequence, while coded areas (e.g. "B") get their own.
  const nextStartFor = (area: Area) => {
    const re = area.code
      ? new RegExp(
          `^${area.code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`
        )
      : /^(\d+)$/
    const max = tables.reduce((m, t) => {
      if (areaFloor(t.areaId) !== area.floorId) return m
      const match = re.exec(t.label)
      return match ? Math.max(m, Number(match[1])) : m
    }, 0)
    return max + 1
  }

  const blocks = (
    <div className="flex flex-col gap-4">
      {orderedAreas.map((a) => (
        <AreaBlock
          key={a.id}
          slug={slug}
          restaurantName={restaurant.name}
          area={a}
          areas={areas}
          floors={floors}
          floorLabel={isMulti ? floorName(a.floorId) : undefined}
          tables={tablesOf(a.id)}
          nextStart={nextStartFor(a)}
          remaining={remaining}
        />
      ))}
      {areas.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Önce bir bölge ekleyin, sonra masaları buraya ekleyebilirsiniz.
        </p>
      )}
    </div>
  )

  const planLink = tables.length > 0 && (
    <Button
      variant="outline"
      size="sm"
      nativeButton={false}
      render={
        <Link href="/plan">
          <LayoutGridIcon className="size-4" />
          Yerleşim planı
        </Link>
      }
    />
  )

  const printAll = tables.length > 0 && (
    <Button
      variant="outline"
      size="sm"
      nativeButton={false}
      render={
        <Link href="/qr">
          <PrinterIcon className="size-4" />
          Tüm QR kodlarını yazdır
        </Link>
      }
    />
  )

  if (embedded) {
    return (
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Masalar</h2>
          <div className="flex items-center gap-2">
            {planLink}
            {printAll}
          </div>
        </div>
        {blocks}
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <StepHeader
        eyebrow="Adım 3 · Masalar"
        title="Masaları hızlıca oluşturun"
        lead="Her bölge için bir sayı seçin — biz “1, 2, 3…” diye otomatik oluşturalım. Özel adlı masaları tek tek de ekleyebilirsiniz."
      />
      {blocks}
      <div className="grid grid-cols-3 gap-3">
        {[
          { n: areas.length, l: "Bölge" },
          { n: tables.length, l: "Masa" },
          { n: totalSeats, l: "Koltuk" },
        ].map((t) => (
          <div
            key={t.l}
            className="rounded-lg border bg-muted/40 p-4 text-center"
          >
            <div className="font-mono text-2xl font-bold tracking-tight">
              {t.n}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{t.l}</div>
          </div>
        ))}
      </div>
      {(planLink || printAll) && (
        <div className="flex justify-center gap-2">
          {planLink}
          {printAll}
        </div>
      )}
    </div>
  )
}
