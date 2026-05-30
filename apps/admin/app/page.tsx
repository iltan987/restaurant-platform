import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { getQueryClient } from "@repo/query/get-query-client"
import { restaurantsQueries } from "@/features/restaurants/queries"
import { RestaurantManager } from "@/features/restaurants/components/restaurant-manager"

export default async function Page() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery(restaurantsQueries.list())

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RestaurantManager />
    </HydrationBoundary>
  )
}
