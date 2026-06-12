import { TooltipProvider } from "@repo/ui/components/ui/tooltip"

import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"

/**
 * The console chrome: a fixed sidebar + sticky topbar wrapping the routed page.
 * Used by the (console) route group layout so every console screen shares it.
 */
export function ConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delay={200}>
      <div className="grid h-svh grid-cols-1 overflow-hidden md:grid-cols-[16rem_minmax(0,1fr)]">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="mx-auto w-full max-w-[1180px]">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
