"use client"

import { useEffect } from "react"

import { useSession } from "@/lib/auth-client"

const ONE_TAP_ENABLED = process.env.NEXT_PUBLIC_ONE_TAP_ENABLED === "true"
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3002"

/**
 * Embeds the apex `/one-tap` page (Google One Tap) as a hidden iframe on the
 * tenant menu and reloads when it signals a successful sign-in. Renders nothing
 * unless `NEXT_PUBLIC_ONE_TAP_ENABLED=true` and the diner is signed out. See the
 * `/one-tap` page for why the prompt must live on the apex origin.
 */
export function OneTapFrame() {
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!ONE_TAP_ENABLED) return
    const apexOrigin = `${window.location.protocol}//${ROOT_DOMAIN}`
    function onMessage(e: MessageEvent) {
      if (
        e.origin === apexOrigin &&
        (e.data as { type?: string })?.type === "one-tap-signed-in"
      ) {
        window.location.reload()
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  // Gated on `isPending` → only renders client-side once the session resolves,
  // so `window` is defined here and there's no SSR/hydration mismatch.
  if (!ONE_TAP_ENABLED || isPending || session) return null

  const apexOrigin = `${window.location.protocol}//${ROOT_DOMAIN}`
  return (
    <iframe
      title="Google ile hızlı giriş"
      src={`${apexOrigin}/one-tap`}
      // Top-right, where GSI renders the prompt. Tune in prod if needed.
      className="fixed top-2 right-2 z-50 h-28 w-80 border-0"
    />
  )
}
