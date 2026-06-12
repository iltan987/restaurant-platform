"use client"

import { ArrowRight, Check } from "lucide-react"

import { type RestaurantWithCounts } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"

import { KvList, KvRow } from "@/components/console/kv-list"
import { Panel, PanelBody, PanelHeader } from "@/components/console/panel"
import { isoDate } from "@/lib/format"

import { setupChecklist, setupProgress, type SetupStep } from "../../lib/derive"
import { type DetailTab } from "./detail-tabs"

const STEP_TAB: Record<SetupStep["id"], DetailTab> = {
  profile: "profil",
  floors: "kat",
  tables: "kat",
  menu: "menu",
  qr: "qr",
}

export function TabOzet({
  r,
  onTab,
}: {
  r: RestaurantWithCounts
  onTab: (tab: DetailTab) => void
}) {
  const steps = setupChecklist(r)
  const { done, total, pct } = setupProgress(r)
  const firstUndone = steps.find((s) => !s.done)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[15px] font-semibold">Kurulum durumu</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {done === total
                  ? "Tüm adımlar tamamlandı — yayına hazır."
                  : `${total - done} adım kaldı`}
              </div>
            </div>
            <div className="font-mono text-2xl font-semibold tabular-nums">
              {pct}%
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                done === total ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <Panel className="mt-4">
          <div className="flex flex-col">
            {steps.map((step) => {
              const isNext = firstUndone?.id === step.id
              return (
                <div
                  key={step.id}
                  className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0"
                >
                  <div
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border",
                      step.done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isNext
                          ? "border-dashed border-primary text-primary"
                          : "border-border"
                    )}
                  >
                    {step.done ? <Check className="size-3.5" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{step.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {step.hint}
                    </div>
                  </div>
                  <Button
                    variant={isNext ? "default" : "outline"}
                    size="sm"
                    onClick={() => onTab(STEP_TAB[step.id])}
                  >
                    {step.done ? "Düzenle" : "Hazırla"}
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      <div className="min-w-0">
        <Panel>
          <PanelHeader title="Özet" />
          <PanelBody className="py-1">
            <KvList>
              <KvRow label="Kat / Alan">
                <span className="font-mono">
                  {r.floorCount} kat · {r.areaCount} alan
                </span>
              </KvRow>
              <KvRow label="Masa">
                <span className="font-mono">{r.tableCount}</span>
              </KvRow>
              <KvRow label="Menü">
                <span className="font-mono">
                  {r.categoryCount} kategori · {r.menuItemCount} ürün
                </span>
              </KvRow>
              <KvRow label="Oluşturulma">
                <span className="font-mono">{isoDate(r.createdAt)}</span>
              </KvRow>
              <KvRow label="Restoran ID">
                <span className="font-mono text-xs break-all text-muted-foreground">
                  {r.id}
                </span>
              </KvRow>
            </KvList>
          </PanelBody>
        </Panel>
      </div>
    </div>
  )
}
