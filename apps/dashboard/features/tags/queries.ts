import { queryOptions } from "@tanstack/react-query"

import { fetchTags } from "./api"

export const tagsQueries = {
  byRestaurant: (restaurantId: string) =>
    queryOptions({
      queryKey: ["tags", restaurantId],
      queryFn: () => fetchTags(restaurantId),
    }),
}
