import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { getQueryClient } from "@repo/query/get-query-client"

import { Dashboard } from "@/features/restaurants/components/dashboard"
import { restaurantsQueries } from "@/features/restaurants/queries"

/** Genel Bakış (dashboard) — fleet stats, attention list, recent restaurants. */
export default async function DashboardPage() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery(restaurantsQueries.list())

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Dashboard />
    </HydrationBoundary>
  )
}
