"use client"

import { Fingerprint, KeyRound, Plus, Trash2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@repo/ui/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/ui/dialog"
import { toast } from "@repo/ui/components/ui/sonner"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { passkey } from "@/lib/auth-client"

type Passkey = { id: string; name?: string | null }

/**
 * Manage WebAuthn passkeys for the signed-in user: list, register one on this
 * device, and remove. Registration triggers the platform biometric/PIN prompt.
 * WebAuthn needs a secure context (HTTPS or localhost).
 */
export function PasskeysDialog() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Passkey[] | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const { data } = await passkey.listUserPasskeys()
    setItems((data as Passkey[] | undefined) ?? [])
  }

  async function onAdd() {
    setBusy(true)
    const res = await passkey.addPasskey({})
    setBusy(false)
    if (res?.error) {
      toast.error("Geçiş anahtarı eklenemedi.")
      return
    }
    toast.success("Geçiş anahtarı eklendi.")
    void refresh()
  }

  async function onDelete(id: string) {
    const { error } = await passkey.deletePasskey({ id })
    if (error) {
      toast.error("Geçiş anahtarı silinemedi.")
      return
    }
    void refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) void refresh()
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            aria-label="Geçiş anahtarları"
          >
            <KeyRound className="size-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Geçiş anahtarları</DialogTitle>
          <DialogDescription>
            Parmak izi, yüz tanıma veya cihaz PIN’i ile şifresiz giriş yapın.
          </DialogDescription>
        </DialogHeader>

        {items === null ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-5 text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Henüz geçiş anahtarı yok. Bu cihaza bir tane ekleyin.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {items.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <Fingerprint className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {p.name || "Geçiş anahtarı"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  aria-label="Sil"
                  onClick={() => onDelete(p.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Button onClick={onAdd} disabled={busy} className="mt-1 h-9">
          {busy ? (
            <Spinner className="size-3.5" />
          ) : (
            <Plus className="size-4" />
          )}
          Bu cihaza geçiş anahtarı ekle
        </Button>
      </DialogContent>
    </Dialog>
  )
}
