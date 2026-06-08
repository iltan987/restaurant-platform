import { notFound } from "next/navigation"

import { fetchRestaurantBySlug } from "@/features/restaurants/api"
import {
  NotAvailable,
  ScanLanding,
} from "@/features/restaurants/components/storefront"

/**
 * Tenant root on the customer storefront. Unknown slug → not-found; a live
 * restaurant → "scan your table's QR" landing; otherwise → "not available yet"
 * (we never hint at a menu for an inactive venue) — FR-030.
 */
export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const restaurant = await fetchRestaurantBySlug(slug)
  if (!restaurant) notFound()

  if (restaurant.status !== "ACTIVE") {
    return <NotAvailable name={restaurant.name} />
  }
  return <ScanLanding restaurant={restaurant} />
}
