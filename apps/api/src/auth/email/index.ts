import { Logger } from "@nestjs/common"

import { env } from "../../config/env"
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

  // The env schema's refine already guarantees the dependent vars are present
  // for the chosen transport at boot; the guards below are backstops (e.g. the
  // schema-gen CLI runs with SKIP_ENV_VALIDATION) that fall back to console.
  if (
    env.EMAIL_TRANSPORT === "resend" &&
    env.RESEND_API_KEY &&
    env.EMAIL_FROM
  ) {
    sender = new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM)
  } else if (
    env.EMAIL_TRANSPORT === "smtp" &&
    env.SMTP_HOST &&
    env.EMAIL_FROM
  ) {
    sender = new SmtpEmailSender({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from: env.EMAIL_FROM,
    })
  } else {
    if (env.EMAIL_TRANSPORT && env.EMAIL_TRANSPORT !== "console") {
      new Logger("Email").warn(
        `EMAIL_TRANSPORT="${env.EMAIL_TRANSPORT}" is missing its config; falling back to console.`
      )
    }
    sender = new ConsoleEmailSender()
  }

  return sender
}
