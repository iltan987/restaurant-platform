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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select"
import { Textarea } from "@repo/ui/components/ui/textarea"

import { EditorSection, Field } from "@/components/field"

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
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-5 pt-5 pb-4">
          <DialogTitle className="text-[17px]">
            {item ? "Ürünü düzenle" : "Yeni ürün"}
          </DialogTitle>
          <DialogDescription>
            {item
              ? "Adı, fiyatı ve diğer ayrıntıları güncelleyin."
              : "Ürün adını ve fiyatını girin. Fiyat Türk Lirası cinsindendir."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-5 pb-1">
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <Field
              label="Ürün adı"
              htmlFor="item-name"
              required
              error={nameError ? "Ürün adı gerekli." : undefined}
            >
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
            </Field>
            <Field
              label="Fiyat (₺)"
              htmlFor="item-price"
              required
              error={priceError ? "Geçerli fiyat girin." : undefined}
            >
              <Input
                id="item-price"
                inputMode="decimal"
                placeholder="0,00"
                value={price}
                aria-invalid={priceError}
                onChange={(e) => setPrice(e.target.value)}
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-card border border-line bg-surface-subtle px-3.5 py-3">
            <Checkbox
              checked={inStock}
              onCheckedChange={(v) => setInStock(v === true)}
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium text-ink">Stokta</span>
              <span className="text-xs text-ink-3">
                Kapatırsanız müşteriye “tükendi” olarak görünür.
              </span>
            </span>
          </label>

          {item && (
            <>
              <EditorSection>
                <MediaUploader itemId={item.id} categoryId={categoryId} />
              </EditorSection>

              <EditorSection title="Ayrıntılar">
                <Field label="Açıklama" htmlFor="item-desc">
                  <Textarea
                    id="item-desc"
                    value={description}
                    maxLength={2000}
                    rows={2}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Field>

                <div className="grid grid-cols-3 gap-3">
                  <Field label="Kalori" htmlFor="item-cal">
                    <Input
                      id="item-cal"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="—"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                    />
                  </Field>
                  <Field label="Porsiyon" htmlFor="item-amount">
                    <Input
                      id="item-amount"
                      type="number"
                      min={0}
                      inputMode="decimal"
                      placeholder="—"
                      value={servingAmount}
                      onChange={(e) => setServingAmount(e.target.value)}
                    />
                  </Field>
                  <Field label="Birim">
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
                  </Field>
                </div>

                {basisOptions.length > 0 && (
                  <Field
                    label="Birim fiyat"
                    hint={
                      <>
                        Müşteriye gösterilen:{" "}
                        <span className="font-medium text-ink tabular-nums">
                          {preview
                            ? `${formatPriceMinor(preview.perUnitMinor)}/${preview.unit}`
                            : "Gösterilmiyor"}
                        </span>
                      </>
                    }
                  >
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
                  </Field>
                )}
              </EditorSection>

              <EditorSection>
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
              </EditorSection>

              <EditorSection>
                <AvailabilityEditor itemId={item.id} categoryId={categoryId} />
              </EditorSection>

              <EditorSection>
                <OptionGroupsEditor
                  itemId={item.id}
                  basePriceMinor={priceMinor ?? item.priceMinor}
                />
              </EditorSection>
            </>
          )}
        </div>

        <DialogFooter className="m-0 rounded-b-xl border-line-subtle bg-surface-subtle px-5 py-3.5">
          <DialogClose render={<Button variant="outline">Vazgeç</Button>} />
          <Button onClick={save}>{item ? "Kaydet" : "Ekle"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
