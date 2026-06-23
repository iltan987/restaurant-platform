"use client"

import { CircleIcon, RectangleHorizontalIcon, SquareIcon } from "lucide-react"
import { type ReactElement, useState } from "react"

import {
  type Area,
  type Floor,
  type Table,
  type TableShape,
} from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/ui/dialog"
import { Input } from "@repo/ui/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select"
import { cn } from "@repo/ui/lib/utils"

import { Field } from "@/components/field"

import { useUpdateTable } from "../use-update-table"

const SHAPES: { value: TableShape; label: string; Icon: typeof SquareIcon }[] =
  [
    { value: "SQUARE", label: "Kare", Icon: SquareIcon },
    { value: "RECT", label: "Dikdörtgen", Icon: RectangleHorizontalIcon },
    { value: "ROUND", label: "Yuvarlak", Icon: CircleIcon },
  ]

/**
 * Full table editor (name · capacity · shape · area). Replaces inline rename so
 * every per-table field lives in one place. Shape is visual-only (drives the
 * floor-plan canvas). Area reassignment moves the table across areas/floors.
 */
export function TableEditDialog({
  slug,
  table,
  areas,
  floors,
  trigger,
}: {
  slug: string
  table: Table
  areas: Area[]
  floors: Floor[]
  trigger: ReactElement
}) {
  const update = useUpdateTable(slug)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState(table.label)
  const [capacity, setCapacity] = useState(
    table.capacity ? String(table.capacity) : ""
  )
  const [shape, setShape] = useState<TableShape>(table.shape)
  const [areaId, setAreaId] = useState(table.areaId)
  const [touched, setTouched] = useState(false)

  const isMulti = floors.length > 1
  const floorRank = new Map(floors.map((f, i) => [f.id, i]))
  const areaOptions = [...areas]
    .sort(
      (a, b) =>
        (floorRank.get(a.floorId) ?? 0) - (floorRank.get(b.floorId) ?? 0)
    )
    .map((a) => ({
      value: a.id,
      label:
        isMulti && floors.find((f) => f.id === a.floorId)
          ? `${floors.find((f) => f.id === a.floorId)!.name} · ${a.name}`
          : a.name,
    }))

  function change(next: boolean) {
    setOpen(next)
    if (next) {
      setLabel(table.label)
      setCapacity(table.capacity ? String(table.capacity) : "")
      setShape(table.shape)
      setAreaId(table.areaId)
      setTouched(false)
    }
  }

  const labelError = touched && !label.trim()

  function save() {
    setTouched(true)
    const name = label.trim()
    if (!name) return
    const parsedCapacity = capacity.trim() ? Number(capacity) : null
    update.mutate({
      id: table.id,
      input: {
        label: name,
        capacity: parsedCapacity,
        shape,
        ...(areaId !== table.areaId ? { areaId } : {}),
      },
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Masayı düzenle</DialogTitle>
          <DialogDescription>
            Ad, kapasite, şekil ve bölge bilgilerini güncelleyin.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field
            label="Masa adı"
            htmlFor="table-label"
            required
            error={labelError ? "Masa adı gerekli." : undefined}
          >
            <Input
              id="table-label"
              value={label}
              autoFocus
              maxLength={40}
              aria-invalid={labelError}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={() => setTouched(true)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </Field>
          <Field label="Kapasite" htmlFor="table-capacity">
            <Input
              id="table-capacity"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="—"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Şekil">
          <div className="grid grid-cols-3 gap-2">
            {SHAPES.map(({ value, label: l, Icon }) => {
              const selected = shape === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setShape(value)}
                  aria-pressed={selected}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border py-3 text-xs font-medium transition",
                    selected
                      ? "border-brand bg-brand-soft text-brand ring-3 ring-brand/20"
                      : "border-line-strong text-ink-3 hover:bg-surface-hover"
                  )}
                >
                  <Icon className="size-5" />
                  {l}
                </button>
              )
            })}
          </div>
        </Field>

        {areaOptions.length > 1 && (
          <Field label="Bölge">
            <Select value={areaId} onValueChange={(v) => v && setAreaId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) =>
                    areaOptions.find((o) => o.value === value)?.label
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {areaOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>İptal</DialogClose>
          <Button onClick={save} disabled={!label.trim()}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
