import { queryOptions } from "@tanstack/react-query"

import { fetchAreas } from "./api"

export const areasQueries = {
  bySlug: (slug: string) =>
    queryOptions({
      queryKey: ["areas", slug],
      queryFn: () => fetchAreas(slug),
    }),
}
