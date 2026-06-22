import { queryOptions } from "@tanstack/react-query"

import { fetchInvitations, fetchOwner } from "./api"

export const invitationsQueries = {
  byRestaurant: (restaurantId: string) =>
    queryOptions({
      queryKey: ["invitations", restaurantId],
      queryFn: () => fetchInvitations(restaurantId),
    }),
}

export const ownerQueries = {
  byRestaurant: (restaurantId: string) =>
    queryOptions({
      queryKey: ["admin", "owner", restaurantId],
      queryFn: () => fetchOwner(restaurantId),
    }),
}
