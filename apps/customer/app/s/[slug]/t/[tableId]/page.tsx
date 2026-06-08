import { notFound } from "next/navigation"

import { fetchRestaurantBySlug } from "@/features/restaurants/api"
import { NotAvailable } from "@/features/restaurants/components/storefront"
import { fetchTable } from "@/features/tables/api"
import { MenuPlaceholder } from "@/features/tables/components/menu-placeholder"

/**
 * The QR target: `<slug>.<root>/t/<tableId>`. The menu shows **only** when the
 * restaurant is ACTIVE *and* the table resolves; any other combination shows
 * "not available yet" (FR-028/FR-029). Unknown slug → not-found.
 */
export default async function TableMenuPage({
  params,
}: {
  params: Promise<{ slug: string; tableId: string }>
}) {
  const { slug, tableId } = await params
  const [restaurant, table] = await Promise.all([
    fetchRestaurantBySlug(slug),
    fetchTable(slug, tableId),
  ])
  if (!restaurant) notFound()

  if (restaurant.status !== "ACTIVE" || !table) {
    return <NotAvailable name={restaurant.name} />
  }
  return <MenuPlaceholder restaurant={restaurant} table={table} />
}
