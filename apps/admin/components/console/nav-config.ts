import {
  Activity,
  LayoutGrid,
  LayoutTemplate,
  type LucideIcon,
  Settings,
  Store,
  Users,
} from "lucide-react"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Marks a navigation target with no backend yet — rendered disabled. */
  disabled?: boolean
  /** When set, the item is active for any pathname starting with this prefix. */
  matchPrefix?: string
}

export type NavSection = {
  label: string
  items: NavItem[]
}

/**
 * Console navigation. Sections mirror the design ("Konsol / Sistem / Ayarlar").
 * Items without a backend yet (`disabled`) render as muted "yakında" entries so
 * the shape of the product is visible while staying honest about what works.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Konsol",
    items: [
      { href: "/", label: "Genel Bakış", icon: LayoutGrid },
      {
        href: "/restoranlar",
        label: "Restoranlar",
        icon: Store,
        matchPrefix: "/restoranlar",
      },
    ],
  },
  {
    label: "Sistem",
    items: [
      { href: "#", label: "Şablonlar", icon: LayoutTemplate, disabled: true },
      { href: "/etkinlik", label: "Etkinlik", icon: Activity },
      { href: "#", label: "Ekip", icon: Users, disabled: true },
    ],
  },
  {
    label: "Ayarlar",
    items: [
      { href: "#", label: "Konsol ayarları", icon: Settings, disabled: true },
    ],
  },
]
