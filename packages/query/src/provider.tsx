"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

import { getQueryClient } from "./get-query-client"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // NOTE: Do not use useState here. If there is a Suspense boundary between
  // this component and the code that may suspend, React will throw away the
  // client on the initial render if it suspends. getQueryClient() handles
  // the singleton correctly for both server and browser.
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
