"use client"

import { z } from "zod"
import { QueryProvider } from "@repo/query/provider"
import { Toaster } from "@repo/ui/components/sonner"

// Set Turkish locale for all Zod validation messages in the admin app.
// Module-level so it runs once when the client bundle loads.
z.config(z.locales.tr())

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      {children}
      <Toaster richColors position="bottom-right" />
    </QueryProvider>
  )
}
