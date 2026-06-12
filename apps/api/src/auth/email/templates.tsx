import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import { render } from "@react-email/render"

import type { EmailMessage } from "./email.types"

/* ── shared palette (email-safe hex; mirrors the dashboard's indigo) ── */
const ACCENT = "#4f46e5"
const TEXT = "#1f2430"
const MUTED = "#6b7280"
const BORDER = "#e5e7eb"
const SURFACE = "#ffffff"
const PAGE = "#f3f4f6"

const main = { backgroundColor: PAGE, margin: 0, padding: "32px 0" }
const fontStack =
  '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif'

const card = {
  maxWidth: "468px",
  margin: "0 auto",
  backgroundColor: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: "14px",
  padding: "36px 36px 28px",
  fontFamily: fontStack,
}
const mark = {
  width: "36px",
  height: "36px",
  borderRadius: "10px",
  backgroundColor: ACCENT,
  marginBottom: "24px",
}
const h1 = {
  fontSize: "20px",
  fontWeight: 600,
  color: TEXT,
  margin: "0 0 8px",
  letterSpacing: "-0.01em",
}
const body = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: TEXT,
  margin: "0 0 16px",
}
const cta = {
  backgroundColor: ACCENT,
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  borderRadius: "10px",
  padding: "11px 20px",
  textDecoration: "none",
  display: "inline-block",
}
const codeBox = {
  fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace",
  fontSize: "26px",
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: TEXT,
  backgroundColor: PAGE,
  border: `1px solid ${BORDER}`,
  borderRadius: "10px",
  padding: "14px 0",
  textAlign: "center" as const,
  margin: "0 0 16px",
}
const fine = { fontSize: "12px", lineHeight: "1.5", color: MUTED, margin: "0" }
const linkSm = {
  fontSize: "12px",
  color: MUTED,
  wordBreak: "break-all" as const,
}
const hr = { borderColor: BORDER, margin: "24px 0 16px" }

/** Branded (yet nameless) shell shared by every email. */
function Layout({
  preview,
  children,
}: {
  preview: string
  children: React.ReactNode
}) {
  return (
    <Html lang="tr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={card}>
          <Section>
            <div style={mark} />
          </Section>
          {children}
          <Hr style={hr} />
          <Text style={fine}>
            Bu e-postayı beklemiyorsanız güvenle yok sayabilirsiniz.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

function InvitationEmail({
  restaurantName,
  link,
}: {
  restaurantName: string
  link: string
}) {
  return (
    <Layout preview={`${restaurantName} ekibine davet edildiniz`}>
      <Heading style={h1}>Ekibe katılın</Heading>
      <Text style={body}>
        <strong>{restaurantName}</strong> ekibine katılmak için davet edildiniz.
        Hesabınızı oluşturmak ve bir parola belirlemek için aşağıdaki bağlantıyı
        kullanın.
      </Text>
      <Section style={{ margin: "4px 0 20px" }}>
        <Button href={link} style={cta}>
          Daveti kabul et
        </Button>
      </Section>
      <Text style={fine}>
        Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:
      </Text>
      <Link href={link} style={linkSm}>
        {link}
      </Link>
      <Text style={{ ...fine, marginTop: "12px" }}>
        Bu bağlantı tek kullanımlıktır ve bir süre sonra geçersiz olur.
      </Text>
    </Layout>
  )
}

function PasswordResetEmail({ link }: { link: string }) {
  return (
    <Layout preview="Parolanızı sıfırlayın">
      <Heading style={h1}>Parolanızı sıfırlayın</Heading>
      <Text style={body}>
        Hesabınızın parolasını sıfırlamak için bir istek aldık. Yeni bir parola
        belirlemek için aşağıdaki bağlantıyı kullanın.
      </Text>
      <Section style={{ margin: "4px 0 20px" }}>
        <Button href={link} style={cta}>
          Parolamı sıfırla
        </Button>
      </Section>
      <Text style={fine}>
        Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:
      </Text>
      <Link href={link} style={linkSm}>
        {link}
      </Link>
      <Text style={{ ...fine, marginTop: "12px" }}>
        Bağlantı yaklaşık 1 saat boyunca geçerlidir.
      </Text>
    </Layout>
  )
}

function PasswordlessEmail({ link, code }: { link?: string; code?: string }) {
  return (
    <Layout preview="Giriş bağlantınız">
      <Heading style={h1}>Giriş yapın</Heading>
      <Text style={body}>
        Giriş yapmak için aşağıdaki{" "}
        {link && code ? "bağlantıyı ya da kodu" : link ? "bağlantıyı" : "kodu"}{" "}
        kullanın.
      </Text>
      {link ? (
        <Section style={{ margin: "4px 0 20px" }}>
          <Button href={link} style={cta}>
            Giriş yap
          </Button>
        </Section>
      ) : null}
      {code ? <div style={codeBox}>{code}</div> : null}
      {link ? (
        <>
          <Text style={fine}>
            Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:
          </Text>
          <Link href={link} style={linkSm}>
            {link}
          </Link>
        </>
      ) : null}
    </Layout>
  )
}

/** Render a React email element to both an HTML and a plain-text body. */
async function renderEmail(
  subject: string,
  element: React.ReactElement
): Promise<Omit<EmailMessage, "to">> {
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ])
  return { subject, html, text }
}

/**
 * Passwordless customer sign-in email. A single message can carry BOTH a magic
 * link and a one-time code — either completes sign-in (research D6).
 */
export function renderPasswordlessEmail(opts: {
  link?: string
  code?: string
}): Promise<Omit<EmailMessage, "to">> {
  return renderEmail("Giriş bağlantınız", <PasswordlessEmail {...opts} />)
}

/**
 * Dashboard password-reset email. Carries the single-use reset link Better Auth
 * builds (valid ~1 hour). Wired via `dashboardAuth.emailAndPassword.sendResetPassword`.
 */
export function renderPasswordResetEmail(opts: {
  link: string
}): Promise<Omit<EmailMessage, "to">> {
  return renderEmail("Şifre sıfırlama", <PasswordResetEmail {...opts} />)
}

/**
 * Owner/member invitation email. Carries the acceptance link (our single-use
 * token). Used by the invitations service (US2, T024).
 */
export function renderInvitationEmail(opts: {
  restaurantName: string
  link: string
}): Promise<Omit<EmailMessage, "to">> {
  return renderEmail(
    `${opts.restaurantName} — davet`,
    <InvitationEmail {...opts} />
  )
}
