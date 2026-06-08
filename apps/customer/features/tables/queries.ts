import { queryOptions } from "@tanstack/react-query"

import { fetchTable } from "./api"

export const tablesQueries = {
  byId: (slug: string, tableId: string) =>
    queryOptions({
      queryKey: ["table", slug, tableId],
      queryFn: () => fetchTable(slug, tableId),
    }),
}
