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
import { Button } from "@repo/ui/components/ui/button"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { Input } from "@repo/ui/components/ui/input"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { ToneBadge } from "@/components/tone-badge"

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
        <h3 className="text-sm font-semibold text-ink">Seçenekler</h3>
        <span className="text-xs text-ink-3">
          Varsayılan fiyat:{" "}
          <span className="font-medium text-ink tabular-nums">
            {formatPriceMinor(defaultPrice)}
          </span>
        </span>
      </div>

      {groups.map((group) => (
        <GroupCard key={group.id} group={group} mutations={m} />
      ))}

      <div className="flex items-center gap-2 rounded-card border border-dashed border-line-strong bg-surface-subtle p-2">
        <Input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Yeni grup adı (ör. Boy, Ekstralar)"
          maxLength={80}
          className="h-9 bg-surface"
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
  const [maxStr, setMaxStr] = useState(group.maxSelect?.toString() ?? "")

  // Commit the "max selections" cap for a multi group (blank = unlimited).
  function commitMax() {
    const trimmed = maxStr.trim()
    const next =
      trimmed === "" ? null : Math.max(1, Math.floor(Number(trimmed)) || 1)
    setMaxStr(next?.toString() ?? "")
    if (next === group.maxSelect) return
    mutations.updateGroup.mutate({
      groupId: group.id,
      input: { maxSelect: next },
    })
  }

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
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line-subtle px-3 py-2">
        <span className="flex-1 truncate text-sm font-medium text-ink">
          {group.name}
        </span>
        <ToneBadge tone="neutral">
          {groupKind(group) === "single" ? "Tek seçim" : "Çoklu seçim"}
        </ToneBadge>
        {groupKind(group) === "multi" && (
          <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink-3">
            En fazla
            <Input
              value={maxStr}
              inputMode="numeric"
              placeholder="∞"
              aria-label="En fazla seçim"
              className="h-7 w-14 text-center"
              onChange={(e) => setMaxStr(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={commitMax}
              onKeyDown={(e) => e.key === "Enter" && commitMax()}
            />
          </label>
        )}
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-ink-3">
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
          className="text-ink-3 hover:text-danger"
          onClick={() => mutations.deleteGroup.mutate(group.id)}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>

      <div className="divide-y divide-line-subtle">
        {group.options.length === 0 ? (
          <p className="px-3 py-2 text-xs text-ink-3">Henüz seçenek yok.</p>
        ) : (
          group.options.map((option) => (
            <div
              key={option.id}
              className="flex items-center gap-2 px-3 py-1.5"
            >
              <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm text-ink">
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
              <span className="shrink-0 text-xs text-ink-3 tabular-nums">
                {option.priceDeltaMinor > 0
                  ? `+${formatPriceMinor(option.priceDeltaMinor)}`
                  : "—"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Seçeneği sil"
                className="text-ink-3 hover:text-danger"
                onClick={() => mutations.deleteOption.mutate(option.id)}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-line-subtle bg-surface-subtle px-3 py-2">
        <Input
          value={optName}
          onChange={(e) => setOptName(e.target.value)}
          placeholder="Seçenek adı"
          maxLength={80}
          className="h-9 flex-1 bg-surface"
          onKeyDown={(e) => e.key === "Enter" && addOption()}
        />
        <Input
          value={optPrice}
          onChange={(e) => setOptPrice(e.target.value)}
          placeholder="+₺"
          inputMode="decimal"
          className="h-9 w-20 bg-surface"
          onKeyDown={(e) => e.key === "Enter" && addOption()}
        />
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-ink-3">
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
