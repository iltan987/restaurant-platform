"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@repo/ui/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { signIn } from "@/lib/auth-client"

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})
type SignInValues = z.infer<typeof signInSchema>

/**
 * Admin sign-in. The single platform admin authenticates here with
 * email + password (sign-up is disabled server-side). On success the session
 * cookie is set and we land on the console; the proxy guards every other route.
 */
export default function SignInPage() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
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
    })
    if (error) {
      // Better Auth returns an indistinguishable error for unknown email vs
      // wrong password (no account-existence leak). 429 = rate-limited.
      setFormError(
        error.status === 429
          ? "Çok fazla deneme. Lütfen biraz bekleyip tekrar deneyin."
          : "E-posta veya parola hatalı."
      )
      return
    }
    router.push("/")
    router.refresh()
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md border border-border bg-card">
            <Lock className="size-4 text-muted-foreground" />
          </div>
          <CardTitle>Yönetim Konsolu</CardTitle>
          <CardDescription>Devam etmek için giriş yapın.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Parola</Label>
              <Input
                id="password"
                type="password"
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

            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}

            <Button type="submit" disabled={isSubmitting} className="mt-1">
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
        </CardContent>
      </Card>
    </main>
  )
}
