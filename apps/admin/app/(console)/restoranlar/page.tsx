import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { getQueryClient } from "@repo/query/get-query-client"

import { FleetView } from "@/features/restaurants/components/fleet-view"
import { restaurantsQueries } from "@/features/restaurants/queries"

/** Restoranlar (fleet) — searchable, filterable list/grid of all tenants. */
export default async function FleetPage() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery(restaurantsQueries.list())

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FleetView />
    </HydrationBoundary>
  )
}
