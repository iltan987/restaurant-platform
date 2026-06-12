"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { FieldError } from "@repo/ui/components/ui/field"

/**
 * Bottom-of-list add control, backed by react-hook-form + zod so the single
 * field gets required / max-length validation with an accessible inline error.
 * Enter (or the + button) submits a trimmed value and clears.
 */
export function InlineAdd({
  placeholder,
  pending,
  maxLength = 60,
  onAdd,
}: {
  placeholder: string
  pending?: boolean
  maxLength?: number
  onAdd: (value: string) => void
}) {
  const schema = z.object({
    value: z.string().trim().min(1).max(maxLength),
  })
  type Values = z.infer<typeof schema>

  const errorMap: z.core.$ZodErrorMap = (issue) => {
    if (issue.code === "too_small") return { message: "Bu alan zorunludur" }
    if (issue.code === "too_big")
      return { message: `En fazla ${maxLength} karakter olabilir` }
  }

  const form = useForm<Values>({
    resolver: zodResolver(schema, { error: errorMap }),
    defaultValues: { value: "" },
    mode: "onSubmit",
  })

  return (
    <form
      onSubmit={form.handleSubmit((v) => {
        onAdd(v.value.trim())
        form.reset()
      })}
      className="border-t bg-muted/40 px-4 py-2.5"
    >
      <Controller
        name="value"
        control={form.control}
        render={({ field, fieldState }) => (
          <>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={pending}
                aria-label="Ekle"
                className="grid size-5 place-items-center rounded text-primary disabled:opacity-40"
              >
                <PlusIcon className="size-4" />
              </button>
              <input
                {...field}
                placeholder={placeholder}
                aria-label={placeholder}
                aria-invalid={fieldState.invalid || undefined}
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
              />
            </div>
            {fieldState.invalid && (
              <FieldError className="mt-1.5 ml-7" errors={[fieldState.error]} />
            )}
          </>
        )}
      />
    </form>
  )
}
