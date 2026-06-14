"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { KeyRound, Mail } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@repo/ui/components/ui/button"
import { Checkbox } from "@repo/ui/components/ui/checkbox"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { AuthShell } from "@/components/auth-shell"
import { GoogleButton } from "@/components/google-button"
import { PasswordInput } from "@/components/password-input"
import { env } from "@/env"
import { signIn } from "@/lib/auth-client"

const GOOGLE_ENABLED = env.NEXT_PUBLIC_GOOGLE_ENABLED === "true"

// Better Auth redirects a failed OAuth flow to `errorCallbackURL?error=<code>`
// (instead of its bare built-in error page). Map the codes a dashboard Google
// sign-in can hit to a friendly Turkish message; everything else is generic.
const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  signup_disabled:
    "Bu Google hesabı bir ekip üyesine ait değil. Panel yalnızca davetle açılır — lütfen davet e-postanızdaki bağlantıyı kullanın.",
  account_not_linked:
    "Bu e-posta başka bir giriş yöntemiyle kayıtlı. Lütfen e-posta ve parolanızla giriş yapın.",
}
const GOOGLE_ERROR_FALLBACK =
  "Google ile giriş tamamlanamadı. Lütfen tekrar deneyin."

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})
type SignInValues = z.infer<typeof signInSchema>

function SignInForm() {
  // A failed Google sign-in lands back here as `?error=<code>` (see
  // errorCallbackURL below); map it to a friendly banner.
  const params = useSearchParams()
  const errorCode = params.get("error")
  const googleError = errorCode
    ? (GOOGLE_ERROR_MESSAGES[errorCode] ?? GOOGLE_ERROR_FALLBACK)
    : null

  const [formError, setFormError] = useState<string | null>(null)
  const [remember, setRemember] = useState(true)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: SignInValues) {
    setFormError(null)
    const { error } = await signIn.email({
      email: values.email,
      password: values.password,
      // When off, Better Auth issues a browser-session cookie (cleared on close).
      rememberMe: remember,
    })
    if (error) {
      setFormError(
        error.status === 429
          ? "Çok fazla deneme. Lütfen biraz bekleyip tekrar deneyin."
          : "E-posta veya parola hatalı."
      )
      return
    }
    window.location.assign("/")
  }

  async function onPasskey() {
    setFormError(null)
    const { error } = await signIn.passkey()
    if (error) {
      setFormError("Geçiş anahtarıyla giriş yapılamadı. Tekrar deneyin.")
      return
    }
    window.location.assign("/")
  }

  // Passkey conditional UI: surface a registered passkey in the email field's
  // autofill (no extra button). New owners just see the normal form.
  useEffect(() => {
    if (typeof PublicKeyCredential === "undefined") return
    if (!PublicKeyCredential.isConditionalMediationAvailable) return
    let cancelled = false
    void PublicKeyCredential.isConditionalMediationAvailable().then((ok) => {
      if (!ok || cancelled) return
      void signIn.passkey({ autoFill: true }).then((res) => {
        if (!cancelled && !res?.error) window.location.assign("/")
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">
          Tekrar hoş geldiniz
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Restoran yönetim panelinize giriş yapın.
        </p>
      </div>

      {googleError ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
        >
          {googleError}
        </p>
      ) : null}

      {/* Passwordless options first — Google + passkey lead, password is the
          fallback below the divider. */}
      <div className="flex flex-col gap-3">
        {GOOGLE_ENABLED ? (
          <GoogleButton
            label="Google ile devam et"
            onClick={() =>
              signIn.social({
                provider: "google",
                // These resolve against the AUTH server origin (the API), not
                // this app — so pass absolute URLs back to the dashboard (this
                // origin), both already trusted via the API's DASHBOARD_URL.
                // errorCallbackURL bounces OAuth failures here as `?error=<code>`
                // instead of Better Auth's bare built-in error page.
                callbackURL: `${window.location.origin}/`,
                errorCallbackURL: `${window.location.origin}/giris`,
              })
            }
          />
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full"
          onClick={onPasskey}
        >
          <KeyRound className="size-4" />
          Geçiş anahtarıyla giriş yap
        </Button>
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> veya
        <span className="h-px flex-1 bg-border" />
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-posta</Label>
          <div className="relative">
            <Mail className="absolute inset-y-0 left-2.5 my-auto size-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              // `webauthn` (last) opts the field into passkey conditional UI.
              autoComplete="email webauthn"
              placeholder="ad@restoraniniz.com"
              className="pl-9"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </div>
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">Parola</Label>
            <Link
              href="/sifremi-unuttum"
              className="text-xs font-medium text-primary hover:underline"
            >
              Şifremi unuttum
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
          <Checkbox
            checked={remember}
            onCheckedChange={(v) => setRemember(v === true)}
          />
          Bu cihazda beni hatırla
        </label>

        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting} className="mt-1 h-9">
          {isSubmitting ? (
            <>
              <Spinner className="size-3.5" />
              Giriş yapılıyor…
            </>
          ) : (
            "Giriş yap"
          )}
        </Button>
      </form>

      <p className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
        Ekibe davet edildiyseniz e-postanızdaki bağlantıyı kullanın.
      </p>
    </>
  )
}

/**
 * Dashboard sign-in for owners/members. On success lands on the apex chooser
 * (`/`), which lists the restaurants the user belongs to. Verification-gated:
 * unverified accounts can't sign in (invited users are verified on acceptance).
 * Wrapped in Suspense because `useSearchParams` requires it.
 */
export default function DashboardSignInPage() {
  return (
    <AuthShell>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Yükleniyor…
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </AuthShell>
  )
}
