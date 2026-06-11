"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { lazy, Suspense, useSyncExternalStore } from "react"

import { getQueryClient } from "./get-query-client"

// Lazy so the devtools bundle is only fetched when explicitly requested via
// the `?devtools` query param — normal page loads pay nothing for it.
const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  }))
)

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // NOTE: Do not use useState for the query client here. If there is a Suspense
  // boundary between this component and the code that may suspend, React will
  // throw away the client on the initial render if it suspends. getQueryClient()
  // handles the singleton correctly for both server and browser.
  const queryClient = getQueryClient()

  // Read the param via an external store so the server renders `false` and the
  // client reads the real value on hydration — no mismatch, no setState effect.
  const showDevtools = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).has("devtools"),
    () => false
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {showDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  )
}
