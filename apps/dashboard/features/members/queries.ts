import { queryOptions } from "@tanstack/react-query"

import { fetchMemberships } from "@/lib/me"

import { fetchMembers } from "./api"

export const membersQueries = {
  /** The team of one restaurant (team management UI). */
  byRestaurant: (restaurantId: string) =>
    queryOptions({
      queryKey: ["members", restaurantId],
      queryFn: () => fetchMembers(restaurantId),
    }),

  /** The signed-in user's memberships — drives the switcher and role gating. */
  memberships: () =>
    queryOptions({
      queryKey: ["me", "restaurants"],
      queryFn: () => fetchMemberships(),
    }),
}
