import { queryOptions } from "@tanstack/react-query"

import { fetchAllergens } from "./api"

export const allergensQueries = {
  byRestaurant: (restaurantId: string) =>
    queryOptions({
      queryKey: ["allergens", restaurantId],
      queryFn: () => fetchAllergens(restaurantId),
    }),
}
