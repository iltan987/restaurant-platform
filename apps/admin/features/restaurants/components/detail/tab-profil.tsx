"use client"

import { ExternalLink, Info, Pencil } from "lucide-react"
import { useState } from "react"

import { type RestaurantWithCounts } from "@repo/schemas"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"

import { KvList, KvRow } from "@/components/console/kv-list"
import { Panel, PanelBody, PanelHeader } from "@/components/console/panel"
import { ComingSoonBadge } from "@/components/console/scaffold-panel"
import { rootDomain, tenantUrl } from "@/lib/domain"

import { RestaurantEditDialog } from "../restaurant-edit-dialog"

export function TabProfil({ r }: { r: RestaurantWithCounts }) {
  const [editOpen, setEditOpen] = useState(false)
  const root = rootDomain()
  const url = tenantUrl(r.slug)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <Panel>
          <PanelHeader
            title="Restoran profili"
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-3.5" />
                Düzenle
              </Button>
            }
          />
          <PanelBody className="py-1">
            <KvList>
              <KvRow label="Görünen ad">
                <span className="font-medium">{r.name}</span>
              </KvRow>
              <KvRow label="Slug / alan adı">
                <span className="font-mono">
                  {r.slug}.{root}
                </span>
              </KvRow>
              <KvRow label="Durum">
                {r.status === "ACTIVE" ? "Aktif" : "Pasif"}
              </KvRow>
              <KvRow label="Onboarding">
                <Badge variant="secondary">{r.onboardingStatus}</Badge>
              </KvRow>
              <KvRow label="Dil / Para birimi">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  Türkçe · ₺
                  <ComingSoonBadge />
                </span>
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

      <div className="min-w-0">
        <div className="flex gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-[13px] leading-relaxed">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Profil, müşteri menüsünün başlığında görünür. Buradaki değişiklikler
            anında yayına yansır.
          </p>
        </div>

        <Panel className="mt-4">
          <PanelHeader title="Bağlantılar" />
          <PanelBody>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <ExternalLink className="size-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Müşteri menüsü</div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {r.slug}.{root}
                </div>
              </div>
            </a>
          </PanelBody>
        </Panel>
      </div>

      <RestaurantEditDialog
        restaurant={r}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  )
}
