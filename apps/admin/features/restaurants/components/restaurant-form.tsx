"use client"

import { useState } from "react"
import { z } from "zod"
import { createRestaurantSchema } from "@repo/schemas"

z.config(z.locales.tr())
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { Spinner } from "@repo/ui/components/spinner"
import { useCreateRestaurant } from "../use-create-restaurant"

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL

export function RestaurantForm() {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({})

  const mutation = useCreateRestaurant()

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})

    const result = createRestaurantSchema.safeParse({
      name,
      slug: slug.trim() || undefined,
    })
    if (!result.success) {
      const flat = z.flattenError(result.error)
      const errors: Partial<Record<string, string>> = {}
      for (const [key, msgs] of Object.entries(flat.fieldErrors)) {
        const list = msgs as string[] | undefined
        if (list?.[0]) errors[key] = list[0]
      }
      setFieldErrors(errors)
      return
    }

    // Per-call onSuccess handles UI reset; the hook's onSuccess handles toasts + cache.
    mutation.mutate(result.data, {
      onSuccess: () => {
        setName("")
        setSlug("")
        setFieldErrors({})
      },
    })
  }

  const rootDomain = DASHBOARD_URL?.replace(/^https?:\/\//, "")

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name" className="text-xs font-medium">
          Ad <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="Restoran adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!fieldErrors["name"]}
          autoComplete="off"
        />
        {fieldErrors["name"] && (
          <p className="text-xs text-destructive">{fieldErrors["name"]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug" className="text-xs font-medium">
          Kısa ad{" "}
          <span className="font-normal text-muted-foreground">
            (isteğe bağlı)
          </span>
        </Label>
        <Input
          id="slug"
          placeholder="otomatik oluşturulur"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          aria-invalid={!!fieldErrors["slug"]}
          autoComplete="off"
          className="font-mono"
        />
        {fieldErrors["slug"] ? (
          <p className="text-xs text-destructive">{fieldErrors["slug"]}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {"URL: "}
            <code>
              {slug.trim()
                ? `${slug.trim()}.${rootDomain}`
                : `<kısa-ad>.${rootDomain}`}
            </code>
          </p>
        )}
      </div>

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
