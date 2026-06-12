import "@repo/ui/globals.css"

import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { cn } from "@repo/ui/lib/utils"

import { Providers } from "./providers"

export const metadata: Metadata = {
  title: "Yönetim Konsolu",
  description: "Geliştirici konsolu — restoran filosu yönetimi",
}

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        geist.variable,
        geistMono.variable,
        "font-sans"
      )}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
