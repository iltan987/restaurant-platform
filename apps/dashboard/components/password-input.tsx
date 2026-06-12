"use client"

import { Eye, EyeOff } from "lucide-react"
import { forwardRef, useState } from "react"

import { Input } from "@repo/ui/components/ui/input"
import { cn } from "@repo/ui/lib/utils"

/**
 * A password `Input` with a reveal toggle. Forwards its ref so it drops into
 * `react-hook-form` via `{...register("password")}` like a plain input.
 */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(function PasswordInput({ className, ...props }, ref) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        ref={ref}
        type={show ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={show ? "Parolayı gizle" : "Parolayı göster"}
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
})
