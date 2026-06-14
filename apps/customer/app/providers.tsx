import { QueryProvider } from "@repo/query/provider"
import { ThemeProvider } from "@repo/ui/components/theme-provider"
import { Toaster } from "@repo/ui/components/ui/sonner"

import { PasskeyOnboarding } from "@/features/auth/components/passkey-onboarding"

import { ZodInit } from "./zod-init"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ZodInit />
      <QueryProvider>
        {children}
        <PasskeyOnboarding />
        <Toaster richColors position="top-center" />
      </QueryProvider>
    </ThemeProvider>
  )
}
