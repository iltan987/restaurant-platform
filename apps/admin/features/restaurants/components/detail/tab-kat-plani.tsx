"use client"

import { useQuery } from "@tanstack/react-query"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"

import { type Area, type Floor, type Table } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { cn } from "@repo/ui/lib/utils"

import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  useCreateArea,
  useDeleteArea,
  useUpdateArea,
} from "@/features/areas/mutations"
import { areasQueries } from "@/features/areas/queries"
import {
  useCreateFloor,
  useDeleteFloor,
  useUpdateFloor,
} from "@/features/floors/mutations"
import { floorsQueries } from "@/features/floors/queries"
import {
  useCreateTable,
  useDeleteTable,
  useUpdateTable,
} from "@/features/tables/mutations"
import { tablesQueries } from "@/features/tables/queries"

/** Inline "type a name → Ekle" row used to add floors/areas/tables. */
function AddInline({
  placeholder,
  onAdd,
}: {
  placeholder: string
  onAdd: (value: string) => void
}) {
  const [value, setValue] = useState("")
  function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue("")
  }
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        placeholder={placeholder}
        maxLength={40}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <Button variant="outline" onClick={submit} disabled={!value.trim()}>
        <PlusIcon className="size-4" />
        Ekle
      </Button>
    </div>
  )
}

/** Click-to-edit name; Enter commits, Escape cancels. */
function EditableName({
  value,
  onSave,
  className,
}: {
  value: string
  onSave: (next: string) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [cancel, setCancel] = useState(false)

  if (editing) {
    return (
      <input
        autoFocus
        defaultValue={value}
        maxLength={40}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (cancel) {
            setCancel(false)
            return
          }
          const next = draft.trim()
          if (next && next !== value) onSave(next)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
          if (e.key === "Escape") {
            setCancel(true)
            e.currentTarget.blur()
          }
        }}
        className="w-40 rounded-md border border-ring bg-background px-2 py-0.5 text-sm font-medium ring-3 ring-ring/30 outline-none"
      />
    )
  }
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value)
        setEditing(true)
      }}
      className={cn(
        "rounded px-1 py-0.5 text-left font-medium transition hover:bg-muted",
        className
      )}
    >
      {value}
    </button>
  )
}

function TableRow({ slug, table }: { slug: string; table: Table }) {
  const update = useUpdateTable(slug)
  const del = useDeleteTable(slug)
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-sm">
      <EditableName
        value={table.label}
        onSave={(label) => update.mutate({ id: table.id, input: { label } })}
      />
      {table.capacity ? (
        <span className="text-xs text-muted-foreground">
          · {table.capacity} kişi
        </span>
      ) : null}
      <ConfirmDialog
        trigger={
          <button
            type="button"
            aria-label={`${table.label} masasını sil`}
            className="ml-auto grid size-5 place-items-center rounded text-muted-foreground transition hover:text-destructive"
          >
            <Trash2Icon className="size-3.5" />
          </button>
        }
        title="Masayı sil"
        description={`"${table.label}" masası kalıcı olarak silinecek.`}
        confirmLabel="Sil"
        destructive
        onConfirm={() => del.mutate(table.id)}
      />
    </div>
  )
}

function AreaSection({
  slug,
  area,
  tables,
}: {
  slug: string
  area: Area
  tables: Table[]
}) {
  const updateArea = useUpdateArea(slug)
  const delArea = useDeleteArea(slug)
  const createTable = useCreateTable(slug)
  const areaTables = tables.filter((t) => t.areaId === area.id)

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-2.5 flex items-center gap-2">
        <EditableName
          value={area.name}
          onSave={(name) => updateArea.mutate({ id: area.id, input: { name } })}
        />
        <span className="text-xs text-muted-foreground">
          {areaTables.length} masa
        </span>
        <ConfirmDialog
          trigger={
            <button
              type="button"
              aria-label={`${area.name} bölgesini sil`}
              className="ml-auto grid size-6 place-items-center rounded text-muted-foreground transition hover:text-destructive"
            >
              <Trash2Icon className="size-3.5" />
            </button>
          }
          title="Bölgeyi sil"
          description={`"${area.name}" bölgesi silinecek.`}
          warning="Bölgede masa varsa önce onları kaldırmanız gerekir."
          confirmLabel="Sil"
          destructive
          onConfirm={() => delArea.mutate(area.id)}
        />
      </div>

      {areaTables.length > 0 && (
        <div className="mb-2.5 flex flex-col gap-1.5">
          {areaTables.map((t) => (
            <TableRow key={t.id} slug={slug} table={t} />
          ))}
        </div>
      )}

      <AddInline
        placeholder="Masa adı (örn. 5)"
        onAdd={(label) =>
          createTable.mutate({ areaId: area.id, input: { label } })
        }
      />
    </div>
  )
}

function FloorSection({
  slug,
  floor,
  areas,
  tables,
}: {
  slug: string
  floor: Floor
  areas: Area[]
  tables: Table[]
}) {
  const updateFloor = useUpdateFloor(slug)
  const delFloor = useDeleteFloor(slug)
  const createArea = useCreateArea(slug)
  const floorAreas = areas.filter((a) => a.floorId === floor.id)

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <EditableName
          value={floor.name}
          onSave={(name) =>
            updateFloor.mutate({ id: floor.id, input: { name } })
          }
          className="text-sm font-semibold"
        />
        <ConfirmDialog
          trigger={
            <button
              type="button"
              aria-label={`${floor.name} katını sil`}
              className="ml-auto grid size-6 place-items-center rounded text-muted-foreground transition hover:text-destructive"
            >
              <Trash2Icon className="size-4" />
            </button>
          }
          title="Katı sil"
          description={`"${floor.name}" katı silinecek.`}
          warning="Katta bölge varsa önce onları kaldırmanız gerekir."
          confirmLabel="Sil"
          destructive
          onConfirm={() => delFloor.mutate(floor.id)}
        />
      </div>

      <div className="flex flex-col gap-3">
        {floorAreas.map((a) => (
          <AreaSection key={a.id} slug={slug} area={a} tables={tables} />
        ))}
        <AddInline
          placeholder="Bölge adı (örn. Teras)"
          onAdd={(name) =>
            createArea.mutate({ floorId: floor.id, input: { name } })
          }
        />
      </div>
    </section>
  )
}

/** Kat planı & Alanlar — inline floor/area/table CRUD over the REST contract. */
export function TabKatPlani({
  slug,
  restaurantId,
}: {
  slug: string
  restaurantId: string
}) {
  const { data: floors = [] } = useQuery(floorsQueries.bySlug(slug))
  const { data: areas = [] } = useQuery(areasQueries.bySlug(slug))
  const { data: tables = [] } = useQuery(tablesQueries.bySlug(slug))
  const createFloor = useCreateFloor(slug, restaurantId)

  return (
    <div className="flex flex-col gap-4">
      {floors.map((f) => (
        <FloorSection
          key={f.id}
          slug={slug}
          floor={f}
          areas={areas}
          tables={tables}
        />
      ))}
      <AddInline
        placeholder="Kat adı (örn. Üst Kat)"
        onAdd={(name) => createFloor.mutate({ name })}
      />
    </div>
  )
}
