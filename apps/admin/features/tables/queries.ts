import { queryOptions } from "@tanstack/react-query"

import { fetchTables } from "./api"

export const tablesQueries = {
  bySlug: (slug: string) =>
    queryOptions({
      queryKey: ["tables", slug],
      queryFn: () => fetchTables(slug),
    }),
}
