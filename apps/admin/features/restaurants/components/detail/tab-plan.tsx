"use client"

import { Info } from "lucide-react"

import { Panel, PanelBody, PanelHeader } from "@/components/console/panel"
import { ComingSoonBadge } from "@/components/console/scaffold-panel"

const TIERS = [
  { id: "baslangic", name: "Başlangıç", limits: "1 kat · 3 alan · QR menü" },
  {
    id: "pro",
    name: "Profesyonel",
    limits: "Çok kat · sınırsız alan · sipariş",
  },
  { id: "kurumsal", name: "Kurumsal", limits: "Çok şube · özel SLA · API" },
]

/**
 * Plan & Faturalama. Admins will *assign* a plan and view billing status;
 * collection/payment happens customer-side. No billing backend yet — this is a
 * prepared, fully-disabled placeholder.
 */
export function TabPlan() {
  return (
    <div className="max-w-3xl">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[15px] font-semibold">Plan & Faturalama</h2>
        <ComingSoonBadge />
      </div>

      <div className="mb-4 flex gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-[13px] leading-relaxed">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Yönetici yalnızca planı <b>atar</b> ve aboneliğin durumunu yönetir.
          Tahsilat ve ödeme yöntemi müşteri tarafında yürür.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.id}
            aria-disabled
            className="rounded-xl border border-border bg-card p-4 opacity-60"
          >
            <div className="text-sm font-semibold">{t.name}</div>
            <div className="mt-2 text-xs text-muted-foreground">{t.limits}</div>
          </div>
        ))}
      </div>

      <Panel className="mt-4">
        <PanelHeader title="Faturalama durumu" />
        <PanelBody className="text-sm text-muted-foreground">
          Plan atama, abonelik durumu ve fatura geçmişi yakında burada olacak.
        </PanelBody>
      </Panel>
    </div>
  )
}
