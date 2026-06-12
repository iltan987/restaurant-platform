"use client"

import {
  Activity,
  CreditCard,
  Home,
  Layers,
  type LucideIcon,
  Menu as MenuIcon,
  QrCode,
  Store,
  Users,
} from "lucide-react"

import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs"

export type DetailTab =
  | "ozet"
  | "profil"
  | "kat"
  | "menu"
  | "qr"
  | "plan"
  | "devir"
  | "etkinlik"

export const DETAIL_TABS: {
  id: DetailTab
  label: string
  icon: LucideIcon
  /** No backend yet — content is a prepared placeholder. */
  scaffold?: boolean
}[] = [
  { id: "ozet", label: "Özet", icon: Home },
  { id: "profil", label: "Profil", icon: Store },
  { id: "kat", label: "Kat planı & Alanlar", icon: Layers },
  { id: "menu", label: "Menü", icon: MenuIcon },
  { id: "qr", label: "QR kodları", icon: QrCode },
  { id: "plan", label: "Plan & Faturalama", icon: CreditCard, scaffold: true },
  { id: "devir", label: "Devir", icon: Users },
  { id: "etkinlik", label: "Etkinlik", icon: Activity, scaffold: true },
]

export function DetailTabsBar({
  value,
  onValueChange,
  badges,
}: {
  value: DetailTab
  onValueChange: (tab: DetailTab) => void
  badges?: Partial<Record<DetailTab, number>>
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(v as DetailTab)}
      className="mb-6"
    >
      <TabsList
        variant="line"
        className="h-auto w-full justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {DETAIL_TABS.map((t) => {
          const Icon = t.icon
          const badge = badges?.[t.id]
          return (
            <TabsTrigger key={t.id} value={t.id} className="flex-none">
              <Icon className="size-4" />
              {t.label}
              {badge != null ? (
                <span className="ml-1 rounded-full bg-muted px-1.5 font-mono text-[10.5px] text-muted-foreground">
                  {badge}
                </span>
              ) : null}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
