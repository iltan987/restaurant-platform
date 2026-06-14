"use client"

import { useEffect } from "react"

import { Spinner } from "@repo/ui/components/ui/spinner"

import { env } from "@/env"
import { useSession } from "@/lib/auth-client"

const ROOT_DOMAIN = env.NEXT_PUBLIC_ROOT_DOMAIN

/** Apex sign-in URL. The tenant lives on a `<slug>.<root>` subdomain, so we send
 * the user to the apex host to sign in. */
function signInHref(): string {
  const protocol =
    typeof window !== "undefined" ? window.location.protocol : "http:"
  return `${protocol}//${ROOT_DOMAIN}/giris`
}

/**
 * Client-side auth gate for a tenant dashboard. Uses `useSession` (browser→API,
 * credentials included) so it works on any host without cross-host cookie
 * sharing. Redirects unauthenticated visitors to sign-in. The API guards are
 * the real boundary; this is the UX layer.
 */
export default function TenantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!isPending && !session) window.location.href = signInHref()
  }, [isPending, session])

  if (isPending || !session) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}
