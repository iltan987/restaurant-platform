import { PageHeader } from "@/components/console/page-header"
import { ActivityFeed } from "@/features/activity/components/activity-feed"

/**
 * Etkinlik — the fleet-wide activity feed. A simple, durable log of notable
 * domain events; detailed/structured logging is a later phase.
 */
export default function ActivityPage() {
  return (
    <div>
      <PageHeader
        title="Etkinlik"
        subtitle="Filo geneli etkinlik akışı — restoran, kurulum ve menü olayları"
      />
      <div className="max-w-3xl">
        <ActivityFeed emptyText="Henüz etkinlik yok." />
      </div>
    </div>
  )
}
