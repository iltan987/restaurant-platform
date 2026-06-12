import { queryOptions } from "@tanstack/react-query"

import { fetchCategories } from "./api"

export const menuQueries = {
  categories: (slug: string) =>
    queryOptions({
      queryKey: ["categories", slug],
      queryFn: () => fetchCategories(slug),
    }),
}
