"use client"

import { Check, Info, Mail, Users } from "lucide-react"

import { type RestaurantWithCounts } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"

import { Panel, PanelHeader } from "@/components/console/panel"
import { ComingSoonBadge } from "@/components/console/scaffold-panel"

import { setupProgress } from "../../lib/derive"

function Step({
  done,
  next,
  label,
  hint,
}: {
  done: boolean
  next?: boolean
  label: string
  hint: string
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0">
      <div
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border",
          done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : next
              ? "border-dashed border-primary text-primary"
              : "border-border"
        )}
      >
        {done ? <Check className="size-3.5" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </div>
  )
}

/**
 * Devir (owner hand-off). Setup completion + go-live derive from real data; the
 * owner invite/accept flow needs an auth/user model that isn't built yet, so
 * those steps and the invite action are prepared placeholders.
 */
export function TabDevir({ r }: { r: RestaurantWithCounts }) {
  const setupDone = setupProgress(r).pct === 100
  const isLive = r.status === "ACTIVE"

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-[15px] font-semibold">Müşteriye devir</h2>
          <ComingSoonBadge />
        </div>

        <div className="mb-4 flex gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-[13px] leading-relaxed">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Kurulum tamamlandıktan sonra restoran sahibini davet edebileceksin.
            Sahip kendi panelinden menü ve masaları yönetir; geliştirici erişimi
            korunur.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <Users className="size-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Sahip atanmadı</div>
            <div className="text-xs text-muted-foreground">
              Henüz kimse davet edilmedi
            </div>
          </div>
          <Button disabled>
            <Mail className="size-4" />
            Sahip davet et
          </Button>
        </div>
      </div>

      <div className="min-w-0">
        <Panel>
          <PanelHeader title="Devir adımları" />
          <div className="flex flex-col">
            <Step
              done={setupDone}
              next={!setupDone}
              label="Kurulum tamamlandı"
              hint="Profil, kat planı, menü, QR"
            />
            <Step
              done={false}
              next={setupDone}
              label="Sahip davet edildi"
              hint="E-posta ile davet · yakında"
            />
            <Step
              done={false}
              label="Davet kabul edildi"
              hint="Sahip hesabını oluşturdu · yakında"
            />
            <Step
              done={isLive}
              label="Yayına alındı"
              hint="Müşteri menüsü erişilebilir"
            />
          </div>
        </Panel>
      </div>
    </div>
  )
}
