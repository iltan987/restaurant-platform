import "@repo/ui/globals.css"

import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

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
