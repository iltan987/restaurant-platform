"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { LogIn } from "lucide-react"
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
 * Dashboard sign-in for owners/members. On success lands on the apex chooser
 * (`/`), which lists the restaurants the user belongs to. Verification-gated:
 * unverified accounts can't sign in (invited users are verified on acceptance).
 */
export default function DashboardSignInPage() {
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
      setFormError(
        error.status === 429
          ? "Çok fazla deneme. Lütfen biraz bekleyip tekrar deneyin."
          : "E-posta veya parola hatalı."
      )
      return
    }
    window.location.assign("/")
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md border border-border bg-card">
            <LogIn className="size-4 text-muted-foreground" />
          </div>
          <CardTitle>Giriş yap</CardTitle>
          <CardDescription>Restoran panelinize erişin.</CardDescription>
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
