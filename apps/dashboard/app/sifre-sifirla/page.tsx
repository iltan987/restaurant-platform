"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Check, KeyRound, TriangleAlert } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { Button } from "@repo/ui/components/ui/button"
import { Label } from "@repo/ui/components/ui/label"
import { Spinner } from "@repo/ui/components/ui/spinner"
import { cn } from "@repo/ui/lib/utils"

import { AuthShell } from "@/components/auth-shell"
import { PasswordInput } from "@/components/password-input"
import { resetPassword } from "@/lib/auth-client"

const resetSchema = z
  .object({
    password: z.string().min(8).max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Parolalar eşleşmiyor",
    path: ["confirm"],
  })
type ResetValues = z.infer<typeof resetSchema>

function ResetForm() {
  const params = useSearchParams()
  const token = params.get("token")
  const tokenError = params.get("error")
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  })
  const password = useWatch({ control, name: "password" })

  async function onSubmit(values: ResetValues) {
    if (!token) return
    setFormError(null)
    const { error } = await resetPassword({
      newPassword: values.password,
      token,
    })
    if (error) {
      setFormError(
        "Bağlantı geçersiz veya süresi dolmuş olabilir. Lütfen yeni bir sıfırlama bağlantısı isteyin."
      )
      return
    }
    setDone(true)
  }

  // No token (or Better Auth flagged it invalid) → dead-end with a way forward.
  if (!token || tokenError) {
    return (
      <>
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <TriangleAlert className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bağlantı geçersiz
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bu sıfırlama bağlantısının süresi dolmuş ya da daha önce kullanılmış
          olabilir. Yeni bir bağlantı isteyin.
        </p>
        <Button
          className="mt-6 h-9 w-full"
          render={<Link href="/sifremi-unuttum" />}
        >
          Yeni bağlantı iste
        </Button>
      </>
    )
  }

  if (done) {
    return (
      <>
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Check className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Parolanız güncellendi
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Yeni parolanızla giriş yapabilirsiniz.
        </p>
        <Button className="mt-6 h-9 w-full" render={<Link href="/giris" />}>
          Giriş yap
        </Button>
      </>
    )
  }

  return (
    <>
      <div className="mb-6 flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
        <KeyRound className="size-5" />
      </div>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">
          Yeni parola belirleyin
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Yeni parolanız önceki parolanızdan farklı olmalıdır.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Yeni parola</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            autoFocus
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs",
              password && password.length >= 8
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "flex size-3.5 items-center justify-center rounded-full border",
                password && password.length >= 8
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-current"
              )}
            >
              {password && password.length >= 8 ? (
                <Check className="size-2.5" />
              ) : null}
            </span>
            En az 8 karakter
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Yeni parola (tekrar)</Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            {...register("confirm")}
          />
          {errors.confirm ? (
            <p className="text-xs text-destructive">{errors.confirm.message}</p>
          ) : null}
        </div>

        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting} className="mt-1 h-9">
          {isSubmitting ? (
            <>
              <Spinner className="size-3.5" />
              Güncelleniyor…
            </>
          ) : (
            "Parolayı güncelle"
          )}
        </Button>
      </form>
    </>
  )
}

/**
 * Set a new password from an emailed reset link. The token arrives as `?token=`
 * (or `?error=` when Better Auth rejects it). Wrapped in Suspense because
 * `useSearchParams` requires it.
 */
export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Yükleniyor…
          </div>
        }
      >
        <ResetForm />
      </Suspense>
    </AuthShell>
  )
}
