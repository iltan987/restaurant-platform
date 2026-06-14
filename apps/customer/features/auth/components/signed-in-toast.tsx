"use client"

import { useEffect } from "react"

import { toast } from "@repo/ui/components/ui/sonner"

/**
 * After a redirect-based sign-in (Google, or the `/giris` email/passkey flows
 * that navigate to `/`), the landing page carries `?signedin=1`. Show a one-time
 * success toast and strip the param. In-place (drawer) sign-ins toast directly.
 * Mounted globally so it fires on whichever page the redirect lands on.
 */
export function SignedInToast() {
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has("signedin")) return
    toast.success("Giriş yapıldı")
    url.searchParams.delete("signedin")
    window.history.replaceState({}, "", url.pathname + url.search + url.hash)
  }, [])
  return null
}
