"use client"

import { ExternalLink, Info, Pencil } from "lucide-react"
import { useState } from "react"

import {
  type Currency,
  currencySchema,
  type Language,
  languageSchema,
  type RestaurantWithCounts,
} from "@repo/schemas"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select"

import { KvList, KvRow } from "@/components/console/kv-list"
import { Panel, PanelBody, PanelHeader } from "@/components/console/panel"
import { rootDomain, TENANT_MODE, tenantDisplay, tenantUrl } from "@/lib/domain"
import { CURRENCY_LABELS, LANGUAGE_LABELS } from "@/lib/plan"

import { useUpdateRestaurant } from "../../use-update-restaurant"
import { RestaurantEditDialog } from "../restaurant-edit-dialog"

export function TabProfil({ r }: { r: RestaurantWithCounts }) {
  const [editOpen, setEditOpen] = useState(false)
  const update = useUpdateRestaurant()
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
                  {TENANT_MODE === "path"
                    ? tenantDisplay(r.slug)
                    : `${r.slug}.${root}`}
                </span>
              </KvRow>
              <KvRow label="Durum">
                {r.status === "ACTIVE" ? "Aktif" : "Pasif"}
              </KvRow>
              <KvRow label="Onboarding">
                <Badge variant="secondary">{r.onboardingStatus}</Badge>
              </KvRow>
              <KvRow label="Dil">
                <Select
                  value={r.language}
                  onValueChange={(v) => {
                    if (v == null || v === r.language) return
                    update.mutate({
                      id: r.id,
                      input: { language: v as Language },
                    })
                  }}
                >
                  <SelectTrigger size="sm" className="w-52">
                    <SelectValue>{LANGUAGE_LABELS[r.language]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {languageSchema.options.map((o) => (
                      <SelectItem key={o} value={o}>
                        {LANGUAGE_LABELS[o]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </KvRow>
              <KvRow label="Para birimi">
                <Select
                  value={r.currency}
                  onValueChange={(v) => {
                    if (v == null || v === r.currency) return
                    update.mutate({
                      id: r.id,
                      input: { currency: v as Currency },
                    })
                  }}
                >
                  <SelectTrigger size="sm" className="w-52">
                    <SelectValue>{CURRENCY_LABELS[r.currency]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {currencySchema.options.map((o) => (
                      <SelectItem key={o} value={o}>
                        {CURRENCY_LABELS[o]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {TENANT_MODE === "path"
                    ? tenantDisplay(r.slug)
                    : `${r.slug}.${root}`}
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
