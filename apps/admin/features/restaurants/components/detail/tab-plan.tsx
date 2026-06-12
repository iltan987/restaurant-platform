"use client"

import { Check, Info } from "lucide-react"

import { planSchema, type RestaurantWithCounts } from "@repo/schemas"
import { cn } from "@repo/ui/lib/utils"

import { Panel, PanelBody, PanelHeader } from "@/components/console/panel"
import { ComingSoonBadge } from "@/components/console/scaffold-panel"
import { PLAN_HINTS, PLAN_LABELS } from "@/lib/plan"

import { useSetRestaurantPlan } from "../../use-set-restaurant-plan"

/**
 * Plan & Faturalama. The plan tier is real and admin-assignable; clicking a
 * tier changes it immediately. Billing/MRR/invoices have no backend yet and
 * stay a "yakında" placeholder — collection/payment happens customer-side.
 */
export function TabPlan({ r }: { r: RestaurantWithCounts }) {
  const setPlan = useSetRestaurantPlan()

  return (
    <div className="max-w-3xl">
      <h2 className="mb-3 text-[15px] font-semibold">Plan & Faturalama</h2>

      <div className="mb-4 flex gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-[13px] leading-relaxed">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Yönetici planı <b>atar</b>; tahsilat ve ödeme müşteri tarafında yürür.
          Plan değişikliği anında geçerli olur.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {planSchema.options.map((plan) => {
          const active = r.plan === plan
          return (
            <button
              key={plan}
              type="button"
              disabled={active || setPlan.isPending}
              onClick={() => setPlan.mutate({ id: r.id, plan })}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                active
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40 disabled:opacity-60"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {PLAN_LABELS[plan]}
                </span>
                {active ? <Check className="size-4 text-primary" /> : null}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {PLAN_HINTS[plan]}
              </div>
            </button>
          )
        })}
      </div>

      <Panel className="mt-4">
        <PanelHeader title="Faturalama durumu" actions={<ComingSoonBadge />} />
        <PanelBody className="text-sm text-muted-foreground">
          Abonelik durumu, MRR ve fatura geçmişi yakında burada olacak.
        </PanelBody>
      </Panel>
    </div>
  )
}
