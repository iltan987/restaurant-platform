import type { EmailMessage, EmailSender } from "./email.types"

/**
 * Production transport via the Resend HTTP API (`https://api.resend.com`, port
 * 443). Preferred over SMTP on PaaS hosts that block outbound SMTP ports
 * (Render blocks 25/465/587 for spam prevention) — there Nodemailer just hangs
 * until timeout. HTTPS is never blocked, so this always works. No SDK needed;
 * a plain `fetch` keeps the CJS NestJS build free of the ESM-only `resend` pkg.
 */
export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      // Never let a slow provider hang the request indefinitely.
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`Resend API responded ${res.status}: ${body}`)
    }
  }
}
