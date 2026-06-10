"use client"

import { type ReactElement, useState } from "react"

import { parsePriceToMinor } from "@repo/core"
import { type MenuItem } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
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
import { Label } from "@repo/ui/components/ui/label"

import { useCreateItem } from "../use-create-item"
import { useUpdateItem } from "../use-update-item"

/** Pre-fills the price field with the major amount, Turkish-formatted (10,50). */
function toMajorInput(priceMinor: number): string {
  return (priceMinor / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Create or edit a menu item. `item` present → edit; absent → create under
 * `categoryId`. Price is entered in lira and stored as integer kuruş.
 */
export function ItemEditorDialog({
  categoryId,
  item,
  trigger,
}: {
  categoryId: string
  item?: MenuItem
  trigger: ReactElement
}) {
  const create = useCreateItem(categoryId)
  const update = useUpdateItem(categoryId)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [inStock, setInStock] = useState(true)
  const [touched, setTouched] = useState(false)

  function change(next: boolean) {
    setOpen(next)
    if (next) {
      setName(item?.name ?? "")
      setPrice(item ? toMajorInput(item.priceMinor) : "")
      setInStock(item?.inStock ?? true)
      setTouched(false)
    }
  }

  const trimmedName = name.trim()
  const priceMinor = parsePriceToMinor(price)
  const nameError = touched && !trimmedName
  const priceError = touched && priceMinor === null

  function save() {
    setTouched(true)
    if (!trimmedName || priceMinor === null) return

    if (item) {
      update.mutate({
        id: item.id,
        input: { name: trimmedName, priceMinor, inStock },
      })
    } else {
      create.mutate({ name: trimmedName, priceMinor, inStock })
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Ürünü düzenle" : "Yeni ürün"}</DialogTitle>
          <DialogDescription>
            Ürün adını ve fiyatını girin. Fiyat Türk Lirası cinsindendir.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[1fr_8rem] gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item-name">Ürün adı</Label>
            <Input
              id="item-name"
              value={name}
              autoFocus
              maxLength={120}
              aria-invalid={nameError}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item-price">Fiyat (₺)</Label>
            <Input
              id="item-price"
              inputMode="decimal"
              placeholder="0,00"
              value={price}
              aria-invalid={priceError}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>
        </div>

        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox
            checked={inStock}
            onCheckedChange={(v) => setInStock(v === true)}
          />
          <span>Stokta</span>
        </label>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Vazgeç</Button>} />
          <Button onClick={save}>{item ? "Kaydet" : "Ekle"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
