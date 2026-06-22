"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"

import { Spinner } from "@repo/ui/components/ui/spinner"

import { env } from "@/env"
import { restaurantsQueries } from "@/features/restaurants/queries"
import { useSession } from "@/lib/auth-client"

import { AppShell } from "./app-shell"

const ROOT_DOMAIN = env.NEXT_PUBLIC_ROOT_DOMAIN

/** Apex sign-in URL — the tenant lives on a `<slug>.<root>` subdomain. */
function signInHref(): string {
  const protocol =
    typeof window !== "undefined" ? window.location.protocol : "http:"
  return `${protocol}//${ROOT_DOMAIN}/giris`
}

/**
 * Client gate around the tenant chrome. Enforces the session (the API guards
 * are the real boundary; this is the UX layer) and keeps the onboarding wizard
 * full-screen — the navigation shell only wraps a set-up restaurant.
 */
export function TenantShell({
  slug,
  children,
}: {
  slug: string
  children: React.ReactNode
}) {
  const { data: session, isPending } = useSession()
  const { data: restaurant } = useQuery(restaurantsQueries.detail(slug))

  useEffect(() => {
    if (!isPending && !session) window.location.href = signInHref()
  }, [isPending, session])

  if (isPending || !session) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-canvas">
        <Spinner className="size-5 text-ink-3" />
      </div>
    )
  }

  if (restaurant?.onboardingStatus === "IN_PROGRESS") {
    return <>{children}</>
  }

  return <AppShell slug={slug}>{children}</AppShell>
}
