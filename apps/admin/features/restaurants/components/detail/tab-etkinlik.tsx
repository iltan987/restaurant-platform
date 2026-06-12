"use client"

import { type RestaurantWithCounts } from "@repo/schemas"

import { ActivityFeed } from "@/features/activity/components/activity-feed"

/** Per-restaurant activity feed (newest first, load-more). */
export function TabEtkinlik({ r }: { r: RestaurantWithCounts }) {
  return (
    <div className="max-w-2xl">
      <h2 className="mb-3 text-[15px] font-semibold">Etkinlik geçmişi</h2>
      <ActivityFeed
        slug={r.slug}
        emptyText="Bu restoran için henüz etkinlik yok."
      />
    </div>
  )
}
