import { queryOptions } from "@tanstack/react-query"

import { fetchInvitations } from "./api"

export const invitationsQueries = {
  byRestaurant: (restaurantId: string) =>
    queryOptions({
      queryKey: ["invitations", restaurantId],
      queryFn: () => fetchInvitations(restaurantId),
    }),
}
