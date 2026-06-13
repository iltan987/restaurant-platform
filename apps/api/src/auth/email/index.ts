import { Logger } from "@nestjs/common"

import { ConsoleEmailSender } from "./console-email-sender"
import type { EmailSender } from "./email.types"
import { ResendEmailSender } from "./resend-email-sender"
import { SmtpEmailSender } from "./smtp-email-sender"

export type { EmailMessage, EmailSender } from "./email.types"
export {
  renderInvitationEmail,
  renderPasswordlessEmail,
  renderPasswordResetEmail,
} from "./templates"

let sender: EmailSender | undefined

/**
 * Lazily builds the process-wide `EmailSender` from `EMAIL_TRANSPORT`
 * (`console` | `smtp` | `resend`). Lives outside Nest DI because it is consumed inside
 * Better Auth callbacks (plain functions, not providers). Defaults to the
 * console transport so local dev needs no SMTP config.
 */
export function getEmailSender(): EmailSender {
  if (sender) return sender

  const transport = process.env.EMAIL_TRANSPORT ?? "console"

  if (transport === "resend") {
    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.EMAIL_FROM
    if (!apiKey || !from) {
      throw new Error(
        "EMAIL_TRANSPORT=resend requires RESEND_API_KEY and EMAIL_FROM to be set."
      )
    }
    sender = new ResendEmailSender(apiKey, from)
  } else if (transport === "smtp") {
    const host = process.env.SMTP_HOST
    const from = process.env.EMAIL_FROM
    if (!host || !from) {
      throw new Error(
        "EMAIL_TRANSPORT=smtp requires SMTP_HOST and EMAIL_FROM to be set."
      )
    }
    sender = new SmtpEmailSender({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from,
    })
  } else {
    if (transport !== "console") {
      new Logger("Email").warn(
        `Unknown EMAIL_TRANSPORT "${transport}"; falling back to console.`
      )
    }
    sender = new ConsoleEmailSender()
  }

  return sender
}
