"use client"

import { useEffect } from "react"

import { oneTap } from "@/lib/auth-client"

const ONE_TAP_ENABLED = process.env.NEXT_PUBLIC_ONE_TAP_ENABLED === "true"

/**
 * Google One Tap intermediate iframe. Lives on the **apex** customer origin —
 * the single origin we can authorize in Google Cloud ("Authorized JavaScript
 * origins" forbids wildcards, so the prompt can't render directly on tenant
 * subdomains). The tenant menu embeds this page in a hidden iframe; here we run
 * the GSI prompt, and on success the API sets the session cookie with
 * `Domain=ROOT_DOMAIN` (shared to every `<slug>.<root>`), then we signal the
 * parent to refresh.
 *
 * Off unless `NEXT_PUBLIC_ONE_TAP_ENABLED=true`. Needs prod (HTTPS, `ROOT_DOMAIN`,
 * authorized origins) — inert over local `nip.io`/http.
 */
export default function OneTapFramePage() {
  useEffect(() => {
    if (!ONE_TAP_ENABLED) return
    void oneTap({
      fetchOptions: {
        onSuccess: () =>
          window.parent?.postMessage({ type: "one-tap-signed-in" }, "*"),
      },
    })
  }, [])

  return null
}
