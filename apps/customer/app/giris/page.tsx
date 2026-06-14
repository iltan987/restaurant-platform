"use client"

import { ArrowLeft, Check, Mail } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"

import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { GoogleButton } from "@/features/auth/components/google-button"
import { emailOtp, signIn } from "@/lib/auth-client"

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true"

type Step = "email" | "code" | "verifying"

function SignInFlow() {
  const params = useSearchParams()
  const linkEmail = params.get("email") ?? ""
  const linkOtp = params.get("otp")

  const [step, setStep] = useState<Step>(
    linkEmail && linkOtp ? "verifying" : "email"
  )
  const [email, setEmail] = useState(linkEmail)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Auto-verify when arriving from the email's one-click link (?email&otp).
  const tried = useRef(false)
  useEffect(() => {
    if (tried.current) return
    tried.current = true
    if (linkEmail && linkOtp) void verify(linkEmail, linkOtp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function sendCode(e?: React.SyntheticEvent) {
    e?.preventDefault()
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

  async function verify(em: string, otp: string) {
    setError(null)
    setPending(true)
    const { error: err } = await signIn.emailOtp({ email: em, otp })
    setPending(false)
    if (err) {
      setError("Kod geçersiz veya süresinin dolmuş olabilir.")
      setEmail(em)
      setStep("code")
      return
    }
    window.location.assign("/")
  }

  return (
    <main className="menu-scope flex min-h-svh flex-col items-center justify-center bg-background px-6 py-10 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-medium tracking-tight">
            Hesabınıza girin
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            İsteğe bağlı — menüye göz atmak için giriş gerekmez.
          </p>
        </div>

        {step === "verifying" ? (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
            <Spinner className="size-6 text-primary" />
            Giriş yapılıyor…
          </div>
        ) : step === "email" ? (
          <form onSubmit={sendCode} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-posta</Label>
              <div className="relative">
                <Mail className="absolute inset-y-0 left-2.5 my-auto size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoFocus
                  required
                  placeholder="siz@ornek.com"
                  className="h-10 pl-9"
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

            <Button type="submit" disabled={pending || !email} className="h-10">
              {pending ? <Spinner className="size-4" /> : null}
              Giriş bağlantısı gönder
            </Button>

            {GOOGLE_ENABLED ? (
              <>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> veya
                  <span className="h-px flex-1 bg-border" />
                </div>
                <GoogleButton
                  label="Google ile devam et"
                  onClick={() =>
                    signIn.social({
                      provider: "google",
                      callbackURL: `${window.location.origin}/`,
                    })
                  }
                />
              </>
            ) : null}
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void verify(email, code)
            }}
            className="flex flex-col gap-4"
            noValidate
          >
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{email}</span>{" "}
              adresine bir giriş bağlantısı ve 6 haneli kod gönderdik. Koda
              tıklayın ya da kodu girin.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Giriş kodu</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                placeholder="123456"
                className="h-11 text-center text-lg tracking-[0.4em]"
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
              className="h-10"
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

        <p className="mt-8 text-center text-sm">
          <Link
            href="/"
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            Menüye dön
          </Link>
        </p>
      </div>
    </main>
  )
}

/**
 * Optional diner sign-in. Email entry → a single email with a one-click link
 * and a 6-digit code (either signs in); arriving via the link auto-verifies.
 * `useSearchParams` requires a Suspense boundary.
 */
export default function CustomerSignInPage() {
  return (
    <Suspense
      fallback={
        <main className="menu-scope flex min-h-svh items-center justify-center bg-background">
          <Spinner className="size-6 text-primary" />
        </main>
      }
    >
      <SignInFlow />
    </Suspense>
  )
}
