"use client"

import { useEffect } from "react"

import { tenantMode } from "@repo/core"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { useSession } from "@/lib/auth-client"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3001"
const TENANT_MODE = tenantMode(process.env.NEXT_PUBLIC_TENANT_MODE)

/** Apex sign-in URL. In subdomain mode the tenant lives on a different host, so
 * we send the user to the apex; in path mode it's the same host. */
function signInHref(): string {
  const protocol =
    typeof window !== "undefined" ? window.location.protocol : "http:"
  return TENANT_MODE === "path" ? "/giris" : `${protocol}//${ROOT_DOMAIN}/giris`
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
