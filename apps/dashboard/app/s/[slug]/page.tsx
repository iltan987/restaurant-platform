import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { notFound } from "next/navigation"

import { getQueryClient } from "@repo/query/get-query-client"

import { restaurantsQueries } from "@/features/restaurants/queries"

export default async function TenantPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const queryClient = getQueryClient()
  const restaurant = await queryClient.fetchQuery(
    restaurantsQueries.detail(slug)
  )

  // Null means 404 from the API; inactive tenants are also treated as not found.
  if (!restaurant || restaurant.status !== "ACTIVE") notFound()

  return (
    // Hydrate the cache so any future client components on this route get the
    // restaurant data instantly without an extra network request.
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-medium">Hoş geldiniz</h1>
          <p className="mt-1 text-muted-foreground">{restaurant.name}</p>
        </div>
      </div>
    </HydrationBoundary>
  )
}
