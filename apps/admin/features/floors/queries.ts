import { queryOptions } from "@tanstack/react-query"

import { fetchFloors } from "./api"

export const floorsQueries = {
  bySlug: (slug: string) =>
    queryOptions({
      queryKey: ["floors", slug],
      queryFn: () => fetchFloors(slug),
    }),
}
