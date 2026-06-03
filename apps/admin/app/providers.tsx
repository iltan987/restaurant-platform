import { QueryProvider } from "@repo/query/provider"
import { Toaster } from "@repo/ui/components/ui/sonner"
import { ThemeProvider } from "@repo/ui/components/theme-provider"
import { ZodInit } from "./zod-init"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ZodInit />
      <QueryProvider>
        {children}
        <Toaster richColors position="bottom-right" />
      </QueryProvider>
    </ThemeProvider>
  )
}
