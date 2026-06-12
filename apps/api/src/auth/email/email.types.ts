/**
 * Provider-agnostic email contract. Better Auth callbacks (magic link, OTP) and
 * the invitation domain send through an `EmailSender` so the transport is a
 * swappable detail — `console` in dev, SMTP (Nodemailer) in prod, a hosted
 * provider as a later drop-in. Selected by `EMAIL_TRANSPORT` (see ./index.ts).
 */
export interface EmailMessage {
  to: string
  subject: string
  /** Plain-text body (always present — the lowest-common-denominator). */
  text: string
  /** Optional HTML body; transports that support it should prefer it. */
  html?: string
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>
}
