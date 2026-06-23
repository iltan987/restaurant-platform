"use client"

import { TriangleAlertIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/ui/alert-dialog"
import { Checkbox } from "@repo/ui/components/ui/checkbox"

type ConfirmDialogProps = {
  /** The element that opens the dialog (merged onto a Base UI trigger). */
  trigger: ReactElement
  title: string
  description: ReactNode
  /** A loud, destructive-tinted callout for the irreversible consequence. */
  warning?: ReactNode
  /** When set, the confirm button stays disabled until this box is checked. */
  requireAck?: boolean
  ackLabel?: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

/**
 * Controlled confirm dialog over the Base UI alert-dialog. The action button
 * does not auto-close (Base UI semantics), so we close it explicitly after
 * firing `onConfirm`. For irreversible actions, pass `warning` (a prominent
 * callout) and `requireAck` (a checkbox gate) so the consequence can't be
 * skim-clicked past (FR-036).
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  warning,
  requireAck,
  ackLabel = "Bu işlemin geri alınamayacağını anlıyorum",
  confirmLabel,
  cancelLabel = "Vazgeç",
  destructive,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [acked, setAcked] = useState(false)

  function change(next: boolean) {
    setOpen(next)
    if (!next) setAcked(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={change}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {warning && (
          <div className="flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-soft p-3 text-sm font-medium text-danger">
            <TriangleAlertIcon className="mt-px size-4 shrink-0" />
            <div>{warning}</div>
          </div>
        )}

        {requireAck && (
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox
              checked={acked}
              onCheckedChange={(v) => setAcked(v === true)}
            />
            <span>{ackLabel}</span>
          </label>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={requireAck && !acked}
            onClick={() => {
              onConfirm()
              change(false)
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
