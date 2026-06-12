import { Logger } from "@nestjs/common"

import type { EmailMessage, EmailSender } from "./email.types"

/**
 * Dev transport: logs the recipient, subject and body (which contains any link
 * and code) to stdout instead of sending. Zero cost, and makes magic
 * links / OTP codes / invitation links copy-pasteable during local testing.
 */
export class ConsoleEmailSender implements EmailSender {
  private readonly logger = new Logger("Email")

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(
      `\n──────── email (console transport) ────────\n` +
        `to:      ${message.to}\n` +
        `subject: ${message.subject}\n` +
        `${message.text}\n` +
        `───────────────────────────────────────────`
    )
  }
}
