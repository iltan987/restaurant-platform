"use client"

import { type ReactElement, useState } from "react"

import {
  formatPriceMinor,
  parsePriceToMinor,
  resolveUnitPrice,
  type ServingUnit,
  type UnitPriceBasis,
} from "@repo/core"
import { type MenuItem, type UpdateMenuItemInput } from "@repo/schemas"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select"
import { Separator } from "@repo/ui/components/ui/separator"
import { Textarea } from "@repo/ui/components/ui/textarea"

import { useCreateItem } from "../use-create-item"
import { useUpdateItem } from "../use-update-item"
import { AllergenPicker } from "./allergen-picker"
import { AvailabilityEditor } from "./availability-editor"
import { MediaUploader } from "./media-uploader"
import { OptionGroupsEditor } from "./option-groups-editor"
import { TagPicker } from "./tag-picker"

const NONE = "NONE"
const SERVING_UNITS: { value: string; label: string }[] = [
  { value: NONE, label: "—" },
  { value: "GRAM", label: "gram (g)" },
  { value: "KILOGRAM", label: "kilogram (kg)" },
  { value: "MILLILITER", label: "mililitre (ml)" },
  { value: "LITER", label: "litre (L)" },
  { value: "PIECE", label: "adet" },
  { value: "PORTION", label: "porsiyon" },
]

// Birim-fiyat (unit price) basis options, labelled in Turkish. AUTO + HIDE are
// always offered; the magnitude options depend on the chosen serving unit.
const UNIT_PRICE_BASIS_LABEL: Record<UnitPriceBasis, string> = {
  AUTO: "Otomatik",
  HIDE: "Gizle",
  PER_KG: "kg başına",
  PER_100G: "100 g başına",
  PER_L: "litre başına",
  PER_100ML: "100 ml başına",
  PER_PIECE: "adet başına",
}

/** Which basis options make sense for a given serving unit (empty = N/A). */
function basisOptionsFor(servingUnit: string): UnitPriceBasis[] {
  switch (servingUnit) {
    case "GRAM":
    case "KILOGRAM":
      return ["AUTO", "HIDE", "PER_KG", "PER_100G"]
    case "MILLILITER":
    case "LITER":
      return ["AUTO", "HIDE", "PER_L", "PER_100ML"]
    case "PIECE":
      return ["AUTO", "HIDE", "PER_PIECE"]
    default:
      return []
  }
}

/** Pre-fills the price field with the major amount, Turkish-formatted (10,50). */
function toMajorInput(priceMinor: number): string {
  return (priceMinor / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Create or edit a menu item. Create is intentionally minimal (name · price ·
 * stock) so building a menu stays fast; the richer fields — description,
 * calories, serving + unit price, allergens, tags, option groups — appear when
 * editing an existing item (US3). Allergens, tags, and options save immediately
 * on change; the scalar fields save on "Kaydet".
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
  const [description, setDescription] = useState("")
  const [calories, setCalories] = useState("")
  const [servingAmount, setServingAmount] = useState("")
  const [servingUnit, setServingUnit] = useState<string>(NONE)
  const [unitPriceBasis, setUnitPriceBasis] = useState<UnitPriceBasis>("AUTO")
  const [touched, setTouched] = useState(false)

  function change(next: boolean) {
    setOpen(next)
    if (next) {
      setName(item?.name ?? "")
      setPrice(item ? toMajorInput(item.priceMinor) : "")
      setInStock(item?.inStock ?? true)
      setDescription(item?.description ?? "")
      setCalories(item?.calories != null ? String(item.calories) : "")
      setServingAmount(
        item?.servingAmount != null ? String(item.servingAmount) : ""
      )
      setServingUnit(item?.servingUnit ?? NONE)
      setUnitPriceBasis(item?.unitPriceBasis ?? "AUTO")
      setTouched(false)
    }
  }

  const trimmedName = name.trim()
  const priceMinor = parsePriceToMinor(price)
  const nameError = touched && !trimmedName
  const priceError = touched && priceMinor === null

  const amountNum = servingAmount.trim() === "" ? null : Number(servingAmount)
  const caloriesNum = calories.trim() === "" ? null : Number(calories)
  const basisOptions = basisOptionsFor(servingUnit)
  const preview =
    priceMinor !== null && servingUnit !== NONE
      ? resolveUnitPrice(
          priceMinor,
          amountNum,
          servingUnit as ServingUnit,
          unitPriceBasis
        )
      : null

  function save() {
    setTouched(true)
    if (!trimmedName || priceMinor === null) return

    if (item) {
      const input: UpdateMenuItemInput = {
        name: trimmedName,
        priceMinor,
        inStock,
        description: description.trim() || null,
        calories:
          caloriesNum != null &&
          Number.isFinite(caloriesNum) &&
          caloriesNum >= 0
            ? Math.round(caloriesNum)
            : null,
        servingAmount:
          amountNum != null && Number.isFinite(amountNum) && amountNum > 0
            ? amountNum
            : null,
        servingUnit: servingUnit === NONE ? null : (servingUnit as ServingUnit),
        unitPriceBasis,
      }
      update.mutate({ id: item.id, input })
    } else {
      create.mutate({ name: trimmedName, priceMinor, inStock })
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
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

        {item && (
          <>
            <Separator />

            <MediaUploader itemId={item.id} categoryId={categoryId} />

            <Separator />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-desc">Açıklama</Label>
              <Textarea
                id="item-desc"
                value={description}
                maxLength={2000}
                rows={2}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-cal">Kalori</Label>
                <Input
                  id="item-cal"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="—"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-amount">Porsiyon</Label>
                <Input
                  id="item-amount"
                  type="number"
                  min={0}
                  inputMode="decimal"
                  placeholder="—"
                  value={servingAmount}
                  onChange={(e) => setServingAmount(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Birim</Label>
                <Select
                  value={servingUnit}
                  onValueChange={(v) => {
                    const next = v ?? NONE
                    setServingUnit(next)
                    // Drop an now-incompatible magnitude back to Otomatik.
                    if (!basisOptionsFor(next).includes(unitPriceBasis)) {
                      setUnitPriceBasis("AUTO")
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(value: string) =>
                        SERVING_UNITS.find((u) => u.value === value)?.label
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SERVING_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {basisOptions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Birim fiyat</Label>
                <Select
                  value={unitPriceBasis}
                  onValueChange={(v) =>
                    setUnitPriceBasis((v ?? "AUTO") as UnitPriceBasis)
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(value: string) =>
                        UNIT_PRICE_BASIS_LABEL[value as UnitPriceBasis]
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {basisOptions.map((b) => (
                      <SelectItem key={b} value={b}>
                        {UNIT_PRICE_BASIS_LABEL[b]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Müşteriye gösterilen:{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {preview
                      ? `${formatPriceMinor(preview.perUnitMinor)}/${preview.unit}`
                      : "Gösterilmiyor"}
                  </span>
                </p>
              </div>
            )}

            <Separator />

            <AllergenPicker
              restaurantId={item.restaurantId}
              itemId={item.id}
              categoryId={categoryId}
            />
            <TagPicker
              restaurantId={item.restaurantId}
              itemId={item.id}
              categoryId={categoryId}
            />

            <Separator />

            <AvailabilityEditor itemId={item.id} categoryId={categoryId} />

            <Separator />

            <OptionGroupsEditor
              itemId={item.id}
              basePriceMinor={priceMinor ?? item.priceMinor}
            />
          </>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Vazgeç</Button>} />
          <Button onClick={save}>{item ? "Kaydet" : "Ekle"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
