import {
  Activity,
  LayoutTemplate,
  Plus,
  Rocket,
  ShieldCheck,
  Store,
} from "lucide-react"

import { PageHeader } from "@/components/console/page-header"
import { Panel, PanelBody, PanelHeader } from "@/components/console/panel"
import { ComingSoonBadge } from "@/components/console/scaffold-panel"

const EVENT_GROUPS = [
  { label: "Oluşturma", icon: Plus },
  { label: "Kurulum", icon: LayoutTemplate },
  { label: "Yayın & durum", icon: Rocket },
]

const SOURCES = [
  { label: "Geliştirici", hint: "Konsoldan", icon: ShieldCheck },
  { label: "Restoran içi", hint: "Sahip / personel", icon: Store },
  { label: "Sistem", hint: "Otomatik işlemler", icon: Activity },
]

/**
 * Etkinlik (global audit trail). No audit-log backend yet — this lays out the
 * intended shape (timeline + breakdown rails) as a prepared placeholder.
 */
export default function ActivityPage() {
  return (
    <div>
      <PageHeader
        title="Etkinlik"
        subtitle="Filo geneli denetim izi — konsol ve restoran içi değişiklikler"
        actions={<ComingSoonBadge />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 text-center">
          <div className="grid size-11 place-items-center rounded-xl bg-background text-muted-foreground shadow-sm">
            <Activity className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Denetim izi yakında</p>
            <p className="mt-0.5 max-w-sm text-sm text-muted-foreground">
              Restoran oluşturma, kurulum, yayına alma ve restoran içi
              değişiklikler burada zaman çizelgesi olarak listelenecek.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader title="Olay türüne göre" />
            <PanelBody className="flex flex-col gap-1 py-2">
              {EVENT_GROUPS.map((g) => (
                <div
                  key={g.label}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground/60"
                >
                  <g.icon className="size-4" />
                  {g.label}
                </div>
              ))}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Kaynağa göre" />
            <PanelBody className="flex flex-col gap-1 py-2">
              {SOURCES.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-muted-foreground/60"
                >
                  <s.icon className="size-4" />
                  <div className="min-w-0">
                    <div className="text-sm">{s.label}</div>
                    <div className="text-[11px]">{s.hint}</div>
                  </div>
                </div>
              ))}
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  )
}
