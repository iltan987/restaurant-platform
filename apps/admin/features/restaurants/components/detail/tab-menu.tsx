"use client"

import { type RestaurantWithCounts } from "@repo/schemas"

import { MenuManager } from "@/features/categories/components/menu-manager"

/** Full menu management — categories, items, options, availability, media. */
export function TabMenu({ r }: { r: RestaurantWithCounts }) {
  return <MenuManager slug={r.slug} restaurantId={r.id} />
}
