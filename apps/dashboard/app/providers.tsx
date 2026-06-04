import { QueryProvider } from "@repo/query/provider"
import { ThemeProvider } from "@repo/ui/components/theme-provider"
import { Toaster } from "@repo/ui/components/ui/sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        {children}
        <Toaster richColors position="bottom-right" />
      </QueryProvider>
    </ThemeProvider>
  )
}
