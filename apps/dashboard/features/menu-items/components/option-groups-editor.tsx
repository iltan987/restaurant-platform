"use client"

import { useQuery } from "@tanstack/react-query"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"

import {
  defaultConfiguration,
  effectivePriceMinor,
  formatPriceMinor,
  type OptionGroupInput,
  parsePriceToMinor,
} from "@repo/core"
import { type OptionGroup } from "@repo/schemas"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { Input } from "@repo/ui/components/ui/input"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { menuItemsQueries } from "../queries"
import { useOptionMutations } from "../use-option-mutations"

/** Starting points; the per-group "Zorunlu" toggle flips required/optional after. */
const PRESETS = {
  single: { minSelect: 1, maxSelect: 1, required: true },
  multi: { minSelect: 0, maxSelect: null, required: false },
} as const

/** Single vs multiple is the maxSelect shape — independent of required. */
function groupKind(g: OptionGroup): "single" | "multi" {
  return g.maxSelect === 1 ? "single" : "multi"
}

/**
 * Option-group editor for an item (US2). Add single- or multi-select groups,
 * each independently toggled required/optional ("Zorunlu"); every option
 * carries a price delta and a "default selected" flag (a removable ingredient =
 * default-on, 0 delta). Shows a live effective price for the default
 * configuration via @repo/core.
 */
export function OptionGroupsEditor({
  itemId,
  basePriceMinor,
}: {
  itemId: string
  basePriceMinor: number
}) {
  const { data, isLoading } = useQuery(menuItemsQueries.detail(itemId))
  const m = useOptionMutations(itemId)
  const [newGroupName, setNewGroupName] = useState("")

  if (isLoading) {
    return (
      <div className="grid place-items-center py-4">
        <Spinner />
      </div>
    )
  }

  const groups = data?.optionGroups ?? []
  const defaultPrice = effectivePriceMinor(
    basePriceMinor,
    groups as OptionGroupInput[],
    defaultConfiguration(groups as OptionGroupInput[])
  )

  function addGroup(kind: keyof typeof PRESETS) {
    const name = newGroupName.trim()
    if (!name) return
    m.createGroup.mutate({ name, ...PRESETS[kind] })
    setNewGroupName("")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Seçenekler</h3>
        <span className="text-xs text-muted-foreground">
          Varsayılan fiyat:{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatPriceMinor(defaultPrice)}
          </span>
        </span>
      </div>

      {groups.map((group) => (
        <GroupCard key={group.id} group={group} mutations={m} />
      ))}

      <div className="flex items-center gap-2 rounded-lg border border-dashed p-2">
        <Input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Yeni grup adı (ör. Boy, Ekstralar)"
          maxLength={80}
          className="h-8"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={!newGroupName.trim()}
          onClick={() => addGroup("single")}
        >
          Tek seçim
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!newGroupName.trim()}
          onClick={() => addGroup("multi")}
        >
          Çoklu seçim
        </Button>
      </div>
    </div>
  )
}

function GroupCard({
  group,
  mutations,
}: {
  group: OptionGroup
  mutations: ReturnType<typeof useOptionMutations>
}) {
  const [optName, setOptName] = useState("")
  const [optPrice, setOptPrice] = useState("")
  const [optDefault, setOptDefault] = useState(false)

  function addOption() {
    const name = optName.trim()
    if (!name) return
    mutations.createOption.mutate({
      groupId: group.id,
      input: {
        name,
        priceDeltaMinor: parsePriceToMinor(optPrice) ?? 0,
        defaultSelected: optDefault,
        isAvailable: true,
      },
    })
    setOptName("")
    setOptPrice("")
    setOptDefault(false)
  }

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="flex-1 truncate text-sm font-medium">
          {group.name}
        </span>
        <Badge variant="secondary">
          {groupKind(group) === "single" ? "Tek seçim" : "Çoklu seçim"}
        </Badge>
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <Checkbox
            checked={group.required}
            onCheckedChange={(v) =>
              mutations.updateGroup.mutate({
                groupId: group.id,
                input: { required: v === true, minSelect: v === true ? 1 : 0 },
              })
            }
          />
          Zorunlu
        </label>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Grubu sil"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => mutations.deleteGroup.mutate(group.id)}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>

      <div className="divide-y">
        {group.options.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Henüz seçenek yok.
          </p>
        ) : (
          group.options.map((option) => (
            <div
              key={option.id}
              className="flex items-center gap-2 px-3 py-1.5"
            >
              <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={option.defaultSelected}
                  onCheckedChange={(v) =>
                    mutations.updateOption.mutate({
                      optionId: option.id,
                      input: { defaultSelected: v === true },
                    })
                  }
                />
                <span className="truncate">{option.name}</span>
              </label>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {option.priceDeltaMinor > 0
                  ? `+${formatPriceMinor(option.priceDeltaMinor)}`
                  : "—"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Seçeneği sil"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => mutations.deleteOption.mutate(option.id)}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-2 border-t bg-muted/40 px-3 py-2">
        <Input
          value={optName}
          onChange={(e) => setOptName(e.target.value)}
          placeholder="Seçenek adı"
          maxLength={80}
          className="h-8 flex-1"
          onKeyDown={(e) => e.key === "Enter" && addOption()}
        />
        <Input
          value={optPrice}
          onChange={(e) => setOptPrice(e.target.value)}
          placeholder="+₺"
          inputMode="decimal"
          className="h-8 w-20"
          onKeyDown={(e) => e.key === "Enter" && addOption()}
        />
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <Checkbox
            checked={optDefault}
            onCheckedChange={(v) => setOptDefault(v === true)}
          />
          Varsayılan
        </label>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Seçenek ekle"
          disabled={!optName.trim()}
          onClick={addOption}
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>
    </div>
  )
}
