"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  createRestaurantSchema,
  SLUG_MAX,
  SLUG_REGEX,
  ErrorCode,
} from "@repo/schemas"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Spinner } from "@repo/ui/components/spinner"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/components/field"
import { getErrorMessage } from "@/lib/messages"
import { ApiError } from "../api"
import { useCreateRestaurant } from "../use-create-restaurant"

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL

// formSchema only adds structural changes on top of the shared schema.
// All user-facing messages live in the zodResolver error map below — no constraint duplication.
const formSchema = createRestaurantSchema.extend({
  slug: z
    .string()
    .transform((v) => (v.trim() === "" ? undefined : v))
    .pipe(z.string().min(1).max(SLUG_MAX).regex(SLUG_REGEX).optional()),
})

const formErrors: z.core.$ZodErrorMap = (issue) => {
  if (issue.path?.[0] === "name") {
    if (issue.code === "too_small") return { message: "Ad alanı zorunludur" }
    if (issue.code === "too_big") return { message: "Ad en fazla 120 karakter olabilir" }
  }
  if (issue.path?.[0] === "slug") {
    if (issue.code === "too_big") return { message: `En fazla ${SLUG_MAX} karakter olabilir` }
    if (issue.code === "invalid_format") return { message: "Sadece küçük harf, rakam ve tire (-) kullanılabilir" }
  }
}

export function RestaurantForm() {
  const form = useForm<
    z.input<typeof formSchema>,
    unknown,
    z.infer<typeof formSchema>
  >({
    resolver: zodResolver(formSchema, { error: formErrors }),
    mode: "onTouched",
    defaultValues: { name: "", slug: "" },
  })

  const mutation = useCreateRestaurant()

  function onSubmit(data: z.infer<typeof formSchema>) {
    mutation.mutate(data, {
      onSuccess: () => form.reset(),
      onError: (err) => {
        if (err instanceof ApiError && err.code === ErrorCode.SLUG_TAKEN) {
          form.setError("slug", { message: getErrorMessage(err.code) })
        }
      },
    })
  }

  const rootDomain = DASHBOARD_URL?.replace(/^https?:\/\//, "")

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor={field.name}>
                Ad <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="Restoran adı"
                aria-invalid={fieldState.invalid || undefined}
                autoComplete="off"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="slug"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor={field.name}>
                Kısa ad{" "}
                <span className="font-normal text-muted-foreground">
                  (isteğe bağlı)
                </span>
              </FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="otomatik oluşturulur"
                aria-invalid={fieldState.invalid || undefined}
                autoComplete="off"
                className="font-mono"
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription>
                  {"URL: "}
                  <code>
                    {field.value?.trim()
                      ? `${field.value.trim()}.${rootDomain}`
                      : `<kısa-ad>.${rootDomain}`}
                  </code>
                </FieldDescription>
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <Button type="submit" disabled={mutation.isPending} className="mt-1">
        {mutation.isPending ? (
          <>
            <Spinner className="mr-2 size-3.5" />
            Ekleniyor…
          </>
        ) : (
          "Restoran Ekle"
        )}
      </Button>
    </form>
  )
}
