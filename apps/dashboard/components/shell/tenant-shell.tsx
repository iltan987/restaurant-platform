"use client"

import { useQuery } from "@tanstack/react-query"
import { ShieldOff } from "lucide-react"
import { useEffect } from "react"

import { Spinner } from "@repo/ui/components/ui/spinner"

import { env } from "@/env"
import { membersQueries } from "@/features/members/queries"
import { restaurantsQueries } from "@/features/restaurants/queries"
import { signOut, useSession } from "@/lib/auth-client"

import { AppShell } from "./app-shell"

const ROOT_DOMAIN = env.NEXT_PUBLIC_ROOT_DOMAIN

/** Apex sign-in URL — the tenant lives on a `<slug>.<root>` subdomain. */
function signInHref(): string {
  const protocol =
    typeof window !== "undefined" ? window.location.protocol : "http:"
  return `${protocol}//${ROOT_DOMAIN}/giris`
}

async function handleSignOut() {
  await signOut()
  const protocol =
    typeof window !== "undefined" ? window.location.protocol : "http:"
  window.location.href = `${protocol}//${ROOT_DOMAIN}/giris`
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
  const { data: memberships, isPending: isMembershipsPending } = useQuery({
    ...membersQueries.memberships(),
    enabled: !!session,
  })

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

  if (isMembershipsPending) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-canvas">
        <Spinner className="size-5 text-ink-3" />
      </div>
    )
  }

  const isMember = memberships?.some((m) => m.slug === slug)
  if (!isMember) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-canvas text-center">
        <ShieldOff className="size-10 text-ink-3" />
        <div className="space-y-1">
          <p className="text-ink-1 text-sm font-medium">
            Bu restoran için erişiminiz kaldırılmıştır.
          </p>
          <p className="text-xs text-ink-3">
            Daha fazla bilgi için platform yöneticisiyle iletişime geçin.
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-xs text-ink-3 underline underline-offset-2 hover:text-ink-2"
        >
          Çıkış yap
        </button>
      </div>
    )
  }

  if (restaurant?.onboardingStatus === "IN_PROGRESS") {
    return <>{children}</>
  }

  return <AppShell slug={slug}>{children}</AppShell>
}
