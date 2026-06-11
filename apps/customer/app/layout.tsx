import "@repo/ui/globals.css"
import "./menu-theme.css"

import type { Metadata } from "next"
import { Geist, Geist_Mono, Newsreader } from "next/font/google"

import { cn } from "@repo/ui/lib/utils"

import { Providers } from "./providers"

export const metadata: Metadata = {
  title: "Menü",
  description: "Masanızdaki QR kodu okutarak menüye ulaşın",
}

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

// Soft serif for menu display headings (restaurant & item names) — the warm,
// appetite-driven counterpart to Geist. Exposed as --font-serif.
const fontSerif = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        fontSerif.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
