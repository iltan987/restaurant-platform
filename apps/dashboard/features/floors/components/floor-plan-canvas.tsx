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
import { ChevronLeftIcon, ListIcon } from "lucide-react"
import Link from "next/link"
import { useMemo, useRef, useState } from "react"

import { type Restaurant, type Table } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"

import { areasQueries } from "@/features/areas/queries"
import { tablesQueries } from "@/features/tables/queries"

import { floorsQueries } from "../queries"
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

/**
 * Auto-arranges tables that have no saved position into a grid grouped by area
 * — each area becomes a horizontal band, its tables spread left-to-right
 * (FR-043). Only unplaced tables are laid out; placed ones keep their coords.
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
  const bands = areaOrder
    .map((id) => [id, byArea.get(id) ?? []] as const)
    .filter(([, ts]) => ts.length > 0)

  const map = new Map<string, { x: number; y: number }>()
  bands.forEach(([, ts], bi) => {
    const y = bands.length === 1 ? 0.5 : 0.14 + (0.72 * bi) / (bands.length - 1)
    ts.forEach((t, ci) => {
      const x = ts.length === 1 ? 0.5 : 0.08 + (0.84 * ci) / (ts.length - 1)
      map.set(t.id, { x, y })
    })
  })
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
        "absolute grid touch-none place-items-center border-2 bg-card text-sm font-semibold shadow-sm transition-colors select-none",
        "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
        SHAPE_CLASS[table.shape],
        palette.node,
        isDragging ? "z-20 cursor-grabbing shadow-lg" : "cursor-grab"
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
    setDropped((prev) => ({ ...prev, [t.id]: next }))
    save.mutate(
      { floorId, positions: [{ tableId: t.id, ...next }] },
      {
        // Drop the override once the cache is authoritative — on success it
        // already matches; on error it reverts to the rolled-back position.
        onSettled: () =>
          setDropped((prev) => {
            const { [t.id]: _drop, ...rest } = prev
            return rest
          }),
      }
    )
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-6 py-3.5">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            className="text-muted-foreground"
            render={<Link href={`/`} />}
          >
            <ChevronLeftIcon className="size-4" />
            Geri
          </Button>
          <h1 className="text-base font-semibold tracking-tight">
            Yerleşim planı
          </h1>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            className="ml-auto"
            render={<Link href={`/`} />}
          >
            <ListIcon className="size-4" />
            Masaları yönet
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-6">
        <p className="text-sm text-muted-foreground">
          Masaları sürükleyerek salonunuzdaki yerleşimine göre düzenleyin. Bu
          yalnızca görsel bir düzendir; QR kodlarını veya menüyü etkilemez. Masa
          eklemek, adlandırmak veya silmek için{" "}
          <Link
            href="/"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            masa listesini
          </Link>{" "}
          kullanın.
        </p>

        {isMulti && (
          <div
            className="flex flex-wrap gap-1.5"
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
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
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
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
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
          <div className="grid place-items-center rounded-2xl border border-dashed bg-muted/30 py-20 text-center text-sm text-muted-foreground">
            Bu katta henüz masa yok.{" "}
            <Link
              href="/"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Önce masa ekleyin.
            </Link>
          </div>
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
              className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border bg-muted/20 [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:40px_40px]"
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
      </main>
    </div>
  )
}
