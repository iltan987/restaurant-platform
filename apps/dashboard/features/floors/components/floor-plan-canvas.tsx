"use client"

import {
  type Announcements,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { useQuery } from "@tanstack/react-query"
import { InfoIcon, LayoutGridIcon, ListIcon, RotateCcwIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useRef, useState } from "react"

import { type Restaurant, type Table } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { areasQueries } from "@/features/areas/queries"
import { tablesQueries } from "@/features/tables/queries"

import { floorsQueries } from "../queries"
import { useResetFloorLayout } from "../use-reset-floor-layout"
import { useSaveFloorLayout } from "../use-save-floor-layout"

/** One palette entry per area — node border + legend dot, cycled by area order. */
const PALETTE = [
  {
    node: "border-indigo-400 text-indigo-700 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
  {
    node: "border-emerald-400 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  {
    node: "border-amber-400 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  { node: "border-sky-400 text-sky-700 dark:text-sky-300", dot: "bg-sky-500" },
  {
    node: "border-rose-400 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  {
    node: "border-violet-400 text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
  },
] as const

const SHAPE_CLASS: Record<Table["shape"], string> = {
  SQUARE: "size-14 rounded-xl",
  RECT: "h-12 w-24 rounded-xl",
  ROUND: "size-14 rounded-full",
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/**
 * Keeps a dragged node fully inside the canvas — dragging past an edge is
 * clamped to that edge rather than allowed out (and then snapped back).
 * `containerNodeRect` is the draggable's positioned parent (the surface).
 */
const restrictToParentElement: Modifier = ({
  containerNodeRect: box,
  draggingNodeRect: node,
  transform,
}) => {
  if (!node || !box) return transform
  const value = { ...transform }
  if (node.top + value.y < box.top) value.y = box.top - node.top
  else if (node.bottom + value.y > box.bottom)
    value.y = box.bottom - node.bottom
  if (node.left + value.x < box.left) value.x = box.left - node.left
  else if (node.right + value.x > box.right) value.x = box.right - node.right
  return value
}

/** Most tables placed on one row before the auto-layout wraps to a new row. */
const MAX_PER_ROW = 8

/**
 * Auto-arranges tables that have no saved position, grouped by area — each area
 * is a horizontal band, its tables wrapped into a tidy grid that grows in rows
 * instead of overflowing one cramped line (FR-043). Bands share the canvas
 * height in proportion to how many rows each needs, and cells are centered so
 * nothing sits on the edges or touches the neighbouring band. Only unplaced
 * tables are laid out; placed ones keep their coords.
 */
function defaultLayout(
  unplaced: Table[],
  areaOrder: string[]
): Map<string, { x: number; y: number }> {
  const byArea = new Map<string, Table[]>()
  for (const t of unplaced) {
    const list = byArea.get(t.areaId) ?? []
    list.push(t)
    byArea.set(t.areaId, list)
  }
  // Balance each band's grid so rows fill evenly (11 tables → 6×2, not 8+3).
  const bands = areaOrder
    .map((id) => byArea.get(id) ?? [])
    .filter((ts) => ts.length > 0)
    .map((ts) => {
      const rows = Math.ceil(ts.length / MAX_PER_ROW)
      const cols = Math.ceil(ts.length / rows)
      return { ts, rows, cols }
    })

  const totalRows = bands.reduce((sum, b) => sum + b.rows, 0)
  const map = new Map<string, { x: number; y: number }>()
  const PAD = 0.06
  let rowCursor = 0
  for (const { ts, rows, cols } of bands) {
    const bandTop = PAD + (1 - 2 * PAD) * (rowCursor / totalRows)
    const bandH = (1 - 2 * PAD) * (rows / totalRows)
    ts.forEach((t, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      map.set(t.id, {
        x: PAD + (1 - 2 * PAD) * ((col + 0.5) / cols),
        y: bandTop + bandH * ((row + 0.5) / rows),
      })
    })
    rowCursor += rows
  }
  return map
}

function TableNode({
  table,
  x,
  y,
  palette,
}: {
  table: Table
  x: number
  y: number
  palette: (typeof PALETTE)[number]
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: table.id })

  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label={`${table.label} masası — taşımak için boşluk tuşuna basıp ok tuşlarını kullanın`}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        // Follow the cursor 1:1 — only the centering offset, the live drag
        // delta, and a lift while dragging. NOT animated: a `transition` on
        // `transform` would lag the node behind the pointer.
        transform: `translate(-50%, -50%) translate3d(${transform?.x ?? 0}px, ${transform?.y ?? 0}px, 0)${isDragging ? " scale(1.05)" : ""}`,
      }}
      className={cn(
        "absolute grid touch-none place-items-center border-2 bg-surface text-sm font-semibold shadow-card transition-colors select-none",
        "focus-visible:ring-3 focus-visible:ring-brand/30 focus-visible:outline-none",
        SHAPE_CLASS[table.shape],
        palette.node,
        isDragging ? "z-20 cursor-grabbing shadow-float" : "cursor-grab"
      )}
      {...listeners}
      {...attributes}
    >
      {table.label}
    </button>
  )
}

export function FloorPlanCanvas({ restaurant }: { restaurant: Restaurant }) {
  const slug = restaurant.slug
  const { data: floors = [] } = useQuery(floorsQueries.bySlug(slug))
  const { data: areas = [] } = useQuery(areasQueries.bySlug(slug))
  const { data: tables = [] } = useQuery(tablesQueries.bySlug(slug))
  const save = useSaveFloorLayout(slug)
  const reset = useResetFloorLayout(slug)

  const [activeFloorId, setActiveFloorId] = useState<string | null>(null)
  // Position set the instant a drag ends, so the node stays put on drop instead
  // of flashing at its old spot until the optimistic cache update lands. Cleared
  // once the save settles (on error it falls back to the rolled-back position).
  const [dropped, setDropped] = useState<
    Record<string, { x: number; y: number }>
  >({})
  const surfaceRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  )

  // Single-floor venues never see the floor concept; multi-floor gets a switcher.
  const isMulti = floors.length > 1
  const floorId = activeFloorId ?? floors[0]?.id ?? null

  const floorAreas = useMemo(
    () => areas.filter((a) => a.floorId === floorId),
    [areas, floorId]
  )
  const areaIds = useMemo(
    () => new Set(floorAreas.map((a) => a.id)),
    [floorAreas]
  )
  const floorTables = useMemo(
    () => tables.filter((t) => areaIds.has(t.areaId)),
    [tables, areaIds]
  )

  const colorOf = (areaId: string) =>
    PALETTE[
      Math.max(
        0,
        floorAreas.findIndex((a) => a.id === areaId)
      ) % PALETTE.length
    ]!

  const defaults = useMemo(() => {
    const unplaced = floorTables.filter(
      (t) => t.positionX == null || t.positionY == null
    )
    return defaultLayout(
      unplaced,
      floorAreas.map((a) => a.id)
    )
  }, [floorTables, floorAreas])

  const posOf = (t: Table) =>
    dropped[t.id] ?? {
      x: t.positionX ?? defaults.get(t.id)?.x ?? 0.5,
      y: t.positionY ?? defaults.get(t.id)?.y ?? 0.5,
    }

  const labelOf = (id: string | number) =>
    floorTables.find((t) => t.id === id)?.label ?? ""

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `${labelOf(active.id)} masası alındı. Ok tuşlarıyla taşıyın.`,
    onDragOver: () => undefined,
    onDragEnd: ({ active }) => `${labelOf(active.id)} masası yerleştirildi.`,
    onDragCancel: ({ active }) =>
      `${labelOf(active.id)} masasının taşınması iptal edildi.`,
  }

  function handleDragEnd({ active, delta }: DragEndEvent) {
    const el = surfaceRef.current
    if (!el || !floorId || (delta.x === 0 && delta.y === 0)) return
    const t = floorTables.find((x) => x.id === active.id)
    if (!t) return
    const rect = el.getBoundingClientRect()
    const start = posOf(t)
    const next = {
      x: clamp01(start.x + delta.x / rect.width),
      y: clamp01(start.y + delta.y / rect.height),
    }
    // Freeze every still-unplaced table at its current resolved spot in the
    // same save, so the auto-layout never re-runs and re-indexes them on the
    // next refetch (which is what made untouched tables teleport).
    const frozen = floorTables
      .filter(
        (x) => x.id !== t.id && (x.positionX == null || x.positionY == null)
      )
      .map((x) => ({ tableId: x.id, ...posOf(x) }))
    const positions = [{ tableId: t.id, ...next }, ...frozen]

    setDropped((prev) => ({
      ...prev,
      [t.id]: next,
      ...Object.fromEntries(frozen.map((f) => [f.tableId, { x: f.x, y: f.y }])),
    }))
    save.mutate(
      { floorId, positions },
      {
        // Drop the overrides once the cache is authoritative — on success it
        // already matches; on error it reverts to the rolled-back positions.
        onSettled: () =>
          setDropped((prev) => {
            const rest = { ...prev }
            for (const p of positions) delete rest[p.tableId]
            return rest
          }),
      }
    )
  }

  function handleReset() {
    if (!floorId) return
    setDropped({})
    reset.mutate({ floorId, tableIds: floorTables.map((t) => t.id) })
  }

  const stats: { n: number; label: string }[] = [
    ...(isMulti ? [{ n: floors.length, label: "Kat" }] : []),
    { n: floorAreas.length, label: "Alan" },
    { n: floorTables.length, label: "Masa" },
  ]

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 py-7 pb-20 sm:px-7">
      <PageHeader
        title="Masalar & Alanlar"
        subtitle="Masaları sürükleyerek salonunuzdaki yerleşime göre düzenleyin."
        actions={
          <>
            {floorTables.length > 0 && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="sm" className="text-ink-3">
                    <RotateCcwIcon className="size-4" />
                    Yerleşimi sıfırla
                  </Button>
                }
                title="Yerleşimi sıfırla"
                description="Bu kattaki tüm masaların elle düzenlenmiş konumları silinir ve otomatik yerleşime döner. Masalar, adları veya QR kodları etkilenmez."
                confirmLabel="Sıfırla"
                onConfirm={handleReset}
              />
            )}
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/" />}
            >
              <ListIcon className="size-4" />
              Masaları yönet
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2.5">
          {stats.map((s) => (
            <span
              key={s.label}
              className="inline-flex items-center gap-1.5 rounded-card border border-line bg-surface px-3 py-1.5 text-sm shadow-soft"
            >
              <span className="font-mono font-semibold text-ink tabular-nums">
                {s.n}
              </span>
              <span className="text-ink-3">{s.label}</span>
            </span>
          ))}
        </div>

        <p className="flex items-start gap-2 text-sm text-ink-3">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-ink-4" />
          <span>
            Bu yalnızca görsel bir düzendir; QR kodlarını veya menüyü etkilemez.
            Masa eklemek, adlandırmak veya silmek için{" "}
            <Link
              href="/"
              className="font-medium text-brand underline-offset-4 hover:underline"
            >
              masaları yönet
            </Link>{" "}
            bölümünü kullanın.
          </span>
        </p>

        {isMulti && (
          <div
            className="inline-flex w-fit gap-1 rounded-lg border border-line bg-surface-muted p-1"
            role="tablist"
            aria-label="Kat seç"
          >
            {floors.map((f) => {
              const selected = f.id === floorId
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveFloorId(f.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:ring-3 focus-visible:ring-brand/30 focus-visible:outline-none",
                    selected
                      ? "bg-surface text-ink shadow-soft"
                      : "text-ink-3 hover:text-ink"
                  )}
                >
                  {f.name}
                </button>
              )
            })}
          </div>
        )}

        {floorAreas.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {floorAreas.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 text-xs text-ink-3"
              >
                <span
                  className={cn("size-2.5 rounded-full", colorOf(a.id).dot)}
                />
                {a.name}
              </span>
            ))}
          </div>
        )}

        {floorTables.length === 0 ? (
          <EmptyState
            icon={<LayoutGridIcon />}
            title="Bu katta henüz masa yok"
            description="Yerleşimi düzenleyebilmek için önce bir masa ekleyin."
          >
            <Button nativeButton={false} render={<Link href="/" />}>
              <ListIcon className="size-4" />
              Masaları yönet
            </Button>
          </EmptyState>
        ) : (
          <DndContext
            id="floor-plan-canvas"
            sensors={sensors}
            modifiers={[restrictToParentElement]}
            onDragEnd={handleDragEnd}
            accessibility={{ announcements }}
          >
            <div
              ref={surfaceRef}
              className="relative aspect-[16/10] w-full overflow-hidden rounded-card border border-line bg-surface-subtle [background-image:linear-gradient(to_right,var(--color-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-line)_1px,transparent_1px)] [background-size:40px_40px] shadow-soft"
            >
              {floorTables.map((t) => {
                const { x, y } = posOf(t)
                return (
                  <TableNode
                    key={t.id}
                    table={t}
                    x={x}
                    y={y}
                    palette={colorOf(t.areaId)}
                  />
                )
              })}
            </div>
          </DndContext>
        )}
      </div>
    </div>
  )
}
