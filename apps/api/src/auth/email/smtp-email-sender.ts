import { createTransport, type Transporter } from "nodemailer"

import type { EmailMessage, EmailSender } from "./email.types"

export interface SmtpConfig {
  host: string
  port: number
  user?: string
  pass?: string
  from: string
}

/**
 * Production transport over SMTP (Nodemailer). A hosted provider (Resend, etc.)
 * is a later drop-in implementing the same `EmailSender` interface.
 */
export class SmtpEmailSender implements EmailSender {
  private readonly transporter: Transporter
  private readonly from: string

  constructor(config: SmtpConfig) {
    this.from = config.from
    this.transporter = createTransport({
      host: config.host,
      port: config.port,
      // Implicit TLS on 465; STARTTLS otherwise.
      secure: config.port === 465,
      auth:
        config.user && config.pass
          ? { user: config.user, pass: config.pass }
          : undefined,
    })
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    })
  }
}
