import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { notFound } from "next/navigation"

import { getQueryClient } from "@repo/query/get-query-client"

import { MenuManager } from "@/features/categories/components/menu-manager"
import { categoriesQueries } from "@/features/categories/queries"
import { menuItemsQueries } from "@/features/menu-items/queries"
import { restaurantsQueries } from "@/features/restaurants/queries"

/**
 * Staff menu-management surface for a tenant (US1). Server-prefetches the
 * category list and each category's items so the manager hydrates instantly,
 * then the client view handles search, drag-reorder, and editing.
 */
export default async function MenuPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const queryClient = getQueryClient()
  const restaurant = await queryClient.fetchQuery(
    restaurantsQueries.detail(slug)
  )
  if (!restaurant) notFound()

  const categories = await queryClient.fetchQuery(
    categoriesQueries.bySlug(slug)
  )
  await Promise.all(
    categories.map((category) =>
      queryClient.prefetchQuery(menuItemsQueries.byCategory(category.id))
    )
  )

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MenuManager slug={slug} restaurantId={restaurant.id} />
    </HydrationBoundary>
  )
}
