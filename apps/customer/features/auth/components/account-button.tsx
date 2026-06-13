"use client"

import { ArrowLeft, Check, LogOut, Mail, User } from "lucide-react"
import { useState } from "react"

import { Button } from "@repo/ui/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@repo/ui/components/ui/drawer"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { emailOtp, signIn, signOut, useSession } from "@/lib/auth-client"

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true"

/**
 * Optional diner account control, floating over the menu cover. Signed-out: opens
 * a bottom-sheet to sign in with a one-time email code (the same code is also in
 * a one-click link). Signed-in: shows the account + sign-out. Never blocks menu
 * browsing. Sign-in is a browser→API XHR, so the session cookie rides along on
 * any tenant subdomain without a redirect.
 */
export function AccountButton() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  const [step, setStep] = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function reset() {
    setStep("email")
    setCode("")
    setError(null)
    setPending(false)
  }

  async function sendCode(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const { error: err } = await emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    })
    setPending(false)
    if (err) {
      setError("Kod gönderilemedi. Lütfen tekrar deneyin.")
      return
    }
    setCode("")
    setStep("code")
  }

  async function verify(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const { error: err } = await signIn.emailOtp({ email, otp: code })
    setPending(false)
    if (err) {
      setError("Kod geçersiz veya süresi dolmuş olabilir.")
      return
    }
    setOpen(false)
    reset()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={session ? "Hesabınız" : "Giriş yap"}
        className="absolute top-[9px] right-[52px] z-[3] grid size-9 place-items-center rounded-full border border-white/[0.22] bg-[oklch(0.28_0.03_45/0.34)] text-white/[0.95] shadow-sm backdrop-blur-[4px] transition active:scale-[0.93] dark:border-white/[0.16] dark:bg-white/[0.12]"
      >
        <User className="size-[18px]" />
      </button>

      <Drawer
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) reset()
        }}
      >
        <DrawerContent className="menu-scope overflow-hidden bg-card outline-none data-[vaul-drawer-direction=bottom]:rounded-t-[28px] data-[vaul-drawer-direction=bottom]:border-0">
          <div className="mx-auto w-full max-w-sm px-6 pt-2 pb-9">
            {session ? (
              <div className="flex flex-col gap-5 text-center">
                <DrawerTitle className="font-display text-2xl font-medium">
                  Hesabınız
                </DrawerTitle>
                <DrawerDescription className="sr-only">
                  Hesap bilgileriniz ve çıkış
                </DrawerDescription>
                <div className="flex items-center justify-center gap-2.5 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
                  <Mail className="size-4 text-muted-foreground" />
                  <span className="truncate">{session.user.email}</span>
                </div>
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={async () => {
                    await signOut()
                    setOpen(false)
                  }}
                >
                  <LogOut className="size-4" />
                  Çıkış yap
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6 text-center">
                  <DrawerTitle className="font-display text-2xl font-medium tracking-tight">
                    Giriş yapın
                  </DrawerTitle>
                  <DrawerDescription className="mt-1.5 text-sm text-muted-foreground">
                    İsteğe bağlı — menüye göz atmak için giriş gerekmez.
                  </DrawerDescription>
                </div>

                {step === "email" ? (
                  <form onSubmit={sendCode} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="acc-email">E-posta</Label>
                      <div className="relative">
                        <Mail className="absolute inset-y-0 left-2.5 my-auto size-4 text-muted-foreground" />
                        <Input
                          id="acc-email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          required
                          placeholder="siz@ornek.com"
                          className="h-11 pl-9"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    {error ? (
                      <p className="text-sm text-destructive" role="alert">
                        {error}
                      </p>
                    ) : null}
                    <Button
                      type="submit"
                      disabled={pending || !email}
                      className="h-11"
                    >
                      {pending ? <Spinner className="size-4" /> : null}
                      Giriş bağlantısı gönder
                    </Button>

                    {GOOGLE_ENABLED ? (
                      <>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="h-px flex-1 bg-border" /> veya
                          <span className="h-px flex-1 bg-border" />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11"
                          onClick={() =>
                            signIn.social({
                              provider: "google",
                              // Return to this exact table menu after Google.
                              callbackURL: window.location.href,
                            })
                          }
                        >
                          Google ile devam et
                        </Button>
                      </>
                    ) : null}
                  </form>
                ) : (
                  <form onSubmit={verify} className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {email}
                      </span>{" "}
                      adresine bir bağlantı ve 6 haneli kod gönderdik.
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="acc-code">Giriş kodu</Label>
                      <Input
                        id="acc-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        required
                        placeholder="123456"
                        className="h-12 text-center text-lg tracking-[0.4em]"
                        value={code}
                        onChange={(e) =>
                          setCode(e.target.value.replace(/\D/g, "").slice(0, 8))
                        }
                      />
                    </div>
                    {error ? (
                      <p className="text-sm text-destructive" role="alert">
                        {error}
                      </p>
                    ) : null}
                    <Button
                      type="submit"
                      disabled={pending || code.length < 6}
                      className="h-11"
                    >
                      {pending ? (
                        <Spinner className="size-4" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Giriş yap
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("email")
                        setError(null)
                      }}
                      className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ArrowLeft className="size-4" /> Farklı e-posta kullan
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
