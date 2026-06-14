"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowRight, LogOut, Store } from "lucide-react"
import Link from "next/link"

import { Button } from "@repo/ui/components/ui/button"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { env } from "@/env"
import { signOut, useSession } from "@/lib/auth-client"
import { fetchMemberships, restaurantHref } from "@/lib/me"

const ROOT_DOMAIN = env.NEXT_PUBLIC_ROOT_DOMAIN

const roleLabel: Record<string, string> = {
  OWNER: "Sahip",
  MANAGER: "Yönetici",
  STAFF: "Personel",
}

/**
 * Apex landing. Signed out: how to reach a restaurant + a sign-in link. Signed
 * in: the restaurants the user belongs to (membership-scoped — they see only
 * their own), each linking into its dashboard.
 */
export function Home() {
  const { data: session, isPending } = useSession()
  const { data: memberships, isPending: loadingMemberships } = useQuery({
    queryKey: ["my-restaurants"],
    queryFn: fetchMemberships,
    enabled: !!session,
  })

  if (isPending) {
    return (
      <Center>
        <Spinner className="size-5 text-muted-foreground" />
      </Center>
    )
  }

  if (!session) {
    const address = `<kısa-ad>.${ROOT_DOMAIN}`
    return (
      <Center>
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            {"Restoranınıza şu adresten erişin: "}
            <code>{address}</code>
          </p>
          <Button nativeButton={false} render={<Link href="/giris" />}>
            Giriş yap
          </Button>
        </div>
      </Center>
    )
  }

  return (
    <Center>
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Restoranlarınız</h1>
            <p className="text-sm text-muted-foreground">
              {session.user.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut()
              window.location.reload()
            }}
          >
            <LogOut className="size-4" />
            Çıkış
          </Button>
        </div>

        {loadingMemberships ? (
          <Spinner className="size-5 text-muted-foreground" />
        ) : memberships && memberships.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {memberships.map((m) => (
              <li key={m.restaurantId}>
                <a
                  href={restaurantHref(m.slug)}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-border/60"
                >
                  <span className="grid size-9 place-items-center rounded-md border border-border">
                    <Store className="size-4 text-muted-foreground" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {roleLabel[m.role] ?? m.role}
                    </span>
                  </span>
                  <ArrowRight className="ml-auto size-4 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Henüz bir restorana bağlı değilsiniz.
          </p>
        )}
      </div>
    </Center>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      {children}
    </div>
  )
}
