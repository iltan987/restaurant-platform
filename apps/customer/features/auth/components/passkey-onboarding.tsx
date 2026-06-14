"use client"

import { Fingerprint } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@repo/ui/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@repo/ui/components/ui/drawer"
import { toast } from "@repo/ui/components/ui/sonner"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { passkey, useListPasskeys, useSession } from "@/lib/auth-client"

import { passkeyAddErrorMessage } from "../passkey-errors"
import { isPasskeyOnboarded, markPasskeyOnboarded } from "../passkey-onboarded"

/**
 * One-time, dismissible nudge to register a passkey, shown right after a diner
 * signs in (email code or Google) with no passkey yet. Mounted globally so it
 * fires from every entry point — the floating account drawer and the `/giris`
 * page alike. Conditional UI can only surface a passkey that already exists, so
 * without this nudge the pool stays empty and autofill never has anything to
 * offer (the "I don't see passkeys" report).
 */
export function PasskeyOnboarding() {
  const { data: session } = useSession()
  const { data: passkeys } = useListPasskeys()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const userId = session?.user.id

  // Open once when a freshly signed-in diner has no passkey and a platform
  // authenticator (Touch ID / Windows Hello / Android) is actually available.
  useEffect(() => {
    if (!userId || open) return
    if (!passkeys || passkeys.length > 0) return
    if (isPasskeyOnboarded(userId)) return
    if (typeof PublicKeyCredential === "undefined") return
    if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
      return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    void PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(
      (ok) => {
        if (!ok || cancelled) return
        // Small delay so we don't collide with a sign-in sheet closing.
        timer = setTimeout(() => setOpen(true), 600)
      }
    )
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [userId, passkeys, open])

  function dismiss() {
    if (userId) markPasskeyOnboarded(userId)
    setOpen(false)
  }

  async function add() {
    setPending(true)
    const res = await passkey.addPasskey({})
    setPending(false)
    if (res?.error) {
      console.error("addPasskey failed", res.error)
      const code = "code" in res.error ? res.error.code : undefined
      toast.error(passkeyAddErrorMessage(code))
      return
    }
    if (userId) markPasskeyOnboarded(userId)
    toast.success(
      "Geçiş anahtarı eklendi. Bir dahaki sefere tek dokunuşla girin."
    )
    setOpen(false)
  }

  return (
    <Drawer open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DrawerContent className="menu-scope overflow-hidden bg-card outline-none data-[vaul-drawer-direction=bottom]:rounded-t-[28px] data-[vaul-drawer-direction=bottom]:border-0">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-5 px-6 pt-2 pb-9 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Fingerprint className="size-6" />
          </div>
          <div className="space-y-1.5">
            <DrawerTitle className="font-display text-2xl font-medium tracking-tight">
              Tek dokunuşla girin
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              Bu cihaza bir geçiş anahtarı ekleyin; bir dahaki sefere kod
              beklemeden parmak izi ya da yüz tanıma ile girin.
            </DrawerDescription>
          </div>
          <div className="flex flex-col gap-2.5">
            <Button className="h-11" disabled={pending} onClick={add}>
              {pending ? (
                <Spinner className="size-4" />
              ) : (
                <Fingerprint className="size-4" />
              )}
              Geçiş anahtarı ekle
            </Button>
            <Button
              variant="ghost"
              className="h-10 text-muted-foreground"
              onClick={dismiss}
            >
              Şimdi değil
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
