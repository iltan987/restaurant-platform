"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { useState } from "react"

import { type Restaurant } from "@repo/schemas"
import { ThemeToggle } from "@repo/ui/components/theme-toggle"
import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"

import { AreasStep } from "@/features/areas/components/areas-step"
import { FloorsStep } from "@/features/floors/components/floors-step"
import { TablesStep } from "@/features/tables/components/tables-step"

import { GoLiveStep } from "./go-live-step"

const STEPS = [
  { label: "Katlar", sub: "Tek mi, çok mu?" },
  { label: "Bölgeler", sub: "Salon, teras, bar…" },
  { label: "Masalar", sub: "Sayı ve kapasite" },
  { label: "Yayına Al", sub: "Panele geç" },
] as const

export function SetupWizard({ restaurant }: { restaurant: Restaurant }) {
  const [step, setStep] = useState(0)
  const last = STEPS.length - 1
  const mark = restaurant.name.trim().charAt(0).toUpperCase() || "R"

  return (
    <div className="flex h-svh bg-background">
      {/* Rail */}
      <aside className="hidden w-70 shrink-0 flex-col border-r bg-muted/30 md:flex">
        <div className="flex items-center gap-2.5 px-6 pt-6 pb-4">
          <span className="grid size-8 place-items-center rounded-lg bg-primary font-semibold text-primary-foreground shadow-sm">
            {mark}
          </span>
          <span className="truncate text-[15px] font-semibold">
            {restaurant.name}
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-2">
          {STEPS.map((s, i) => {
            const state = i === step ? "active" : i < step ? "done" : "upcoming"
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
                  state === "active" ? "bg-card shadow-sm" : "hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border font-mono text-xs font-semibold transition",
                    state === "active" &&
                      "border-primary bg-primary text-primary-foreground",
                    state === "done" &&
                      "border-primary/30 bg-primary/10 text-primary",
                    state === "upcoming" &&
                      "border-border text-muted-foreground"
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      state === "upcoming" && "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {s.sub}
                  </span>
                </span>
              </button>
            )
          })}
        </nav>

        <div className="flex h-16 items-center justify-between gap-2 border-t px-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setStep(last)}
          >
            Daha sonra tamamla
          </Button>
          <ThemeToggle />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile progress header */}
        <header className="flex items-center justify-between border-b px-5 py-3 md:hidden">
          <span className="text-sm font-medium">
            {step + 1}/{STEPS.length} · {STEPS[step]!.label}
          </span>
          <ThemeToggle />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-6 py-10 sm:px-10 sm:py-14">
            {step === 0 && <FloorsStep restaurant={restaurant} />}
            {step === 1 && <AreasStep restaurant={restaurant} />}
            {step === 2 && <TablesStep restaurant={restaurant} />}
            {step === 3 && <GoLiveStep restaurant={restaurant} />}
          </div>
        </div>

        {/* Footer nav — fixed 3-column grid so the dots never shift */}
        <footer className="grid h-16 grid-cols-[1fr_auto_1fr] items-center border-t bg-background px-6 sm:px-10">
          <div className="justify-self-start">
            <Button
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              <ChevronLeftIcon className="size-4" />
              Geri
            </Button>
          </div>

          <div className="flex items-center gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.label}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-5 bg-primary" : "w-1.5 bg-border"
                )}
              />
            ))}
          </div>

          <div className="justify-self-end">
            {step < last && (
              <Button onClick={() => setStep((s) => s + 1)}>
                Devam
                <ChevronRightIcon className="size-4" />
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
