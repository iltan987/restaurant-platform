import { passkey } from "@better-auth/passkey"
import { betterAuth, type BetterAuthOptions } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { emailOTP } from "better-auth/plugins"

import { prisma } from "@repo/db"

import { env } from "../config/env"
import {
  getEmailSender,
  renderPasswordlessEmail,
  renderPasswordResetEmail,
} from "./email"
import {
  googleCredentials,
  passkeyRpId,
  rootDomain,
  trustedOrigins,
} from "./env"

/**
 * Three isolated Better Auth instances on the one API (research D3). Distinct
 * `basePath`, `cookiePrefix` and identity tables (`modelName`) make cross-
 * authorization structurally impossible: no instance can read another's cookie,
 * and there is no shared user row to mis-grant. All reuse the existing
 * `@repo/db` Prisma singleton — the API stays the sole DB owner (D1).
 *
 * NOTE: the schema-gen CLI resolves a single `auth` export per config file, so
 * tables are generated per instance via the re-export shims in `./schema-gen/`
 * (see tasks T006).
 */

/**
 * Options shared by every instance. Per-instance config is layered on top.
 * Exported so the admin seed (T014) can build a throwaway instance over the
 * same `admin_*` tables with sign-up enabled.
 */
export function sharedOptions(prefix: string): BetterAuthOptions {
  return {
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    // Read by Better Auth from BETTER_AUTH_SECRET/BETTER_AUTH_URL too; passed
    // explicitly so the source of truth is obvious. Lenient (may be undefined
    // during schema generation) — Better Auth enforces a real secret in prod.
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins,
    // Isolated identity tables per audience.
    user: { modelName: `${prefix}_user` },
    // Bounded, rolling sessions for every audience: expire after 30 days,
    // refreshed at most once a day (FR-022–024). `rememberMe: false` on sign-in
    // overrides this to a browser-session cookie regardless of `expiresIn`.
    session: {
      modelName: `${prefix}_session`,
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    account: { modelName: `${prefix}_account` },
    verification: { modelName: `${prefix}_verification` },
    // Window-based throttling (decays — never a permanent lockout, D8). Each
    // instance keeps its own table to avoid cross-audience key collisions.
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: `${prefix}_rate_limit`,
      customRules: {
        "/sign-in/email": { window: 10, max: 5 },
        // Resend-able sends: a couple retries per minute, then 429. The client
        // adds a 60s cooldown on top; this is the server-side backstop. Shared
        // across instances — harmless where the route isn't exposed.
        "/email-otp/send-verification-otp": { window: 60, max: 3 },
        "/request-password-reset": { window: 60, max: 3 },
      },
    },
    advanced: {
      cookiePrefix:
        prefix === "dash" ? "dash" : prefix === "cust" ? "cust" : "pa",
      // Prod: share the session cookie across api.<root> ↔ <slug>.<root>.
      ...(rootDomain
        ? { crossSubDomainCookies: { enabled: true, domain: rootDomain } }
        : {}),
    },
  }
}

/**
 * Platform admin: a single seeded email+password account. Public sign-up is
 * disabled — the one admin is provisioned server-side (research D7).
 */
export const adminAuth = betterAuth({
  ...sharedOptions("admin"),
  basePath: "/api/auth/admin",
  emailAndPassword: { enabled: true, disableSignUp: true },
})

/**
 * Restaurant dashboard (owners/members). Email+password, verification-gated.
 * Accounts are never self-served — they come into existence only through
 * invitation acceptance (server-to-server creation, research D5).
 */
export const dashboardAuth = betterAuth({
  ...sharedOptions("dash"),
  basePath: "/api/auth/dashboard",
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: true,
    // Self-service recovery: emailed single-use link (1h default TTL). Resetting
    // invalidates other sessions so a leaked password can't outlive the reset.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const message = await renderPasswordResetEmail({ link: url })
      await getEmailSender().send({ to: user.email, ...message })
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const message = await renderPasswordlessEmail({ link: url })
      await getEmailSender().send({ to: user.email, ...message })
    },
  },
  // Google sign-in for owners/members. `disableSignUp` keeps the invitation-only
  // model intact: a Google login only ever LINKS to an already-invited account
  // (matched by verified email); an unknown email is rejected, never created.
  ...(googleCredentials
    ? {
        socialProviders: {
          google: { ...googleCredentials, disableSignUp: true },
        },
      }
    : {}),
  // Passkeys (WebAuthn): register while signed in, then sign in passwordless.
  // `rpID` is the app root domain so a passkey works across the apex sign-in
  // and `<slug>.<root>` workspaces; `origin` is left unset so Better Auth uses
  // the request Origin (any tenant subdomain). Table mapped per audience.
  plugins: [
    passkey({
      rpID: passkeyRpId(env.DASHBOARD_URL),
      rpName: "Restoran Yönetim Paneli",
      schema: { passkey: { modelName: "dash_passkey" } },
    }),
  ],
})

/**
 * Customer storefront (diners). Optional, non-gating sign-in: Google +
 * passwordless email. One verified email = one identity via default
 * (verified-email) account linking — `trustedProviders`/`allowDifferentEmails`
 * left off on purpose (research D6).
 *
 * Passwordless is a SINGLE plugin (email OTP) so exactly one email goes out:
 * it carries the code AND a one-click link that embeds the same code (our
 * "magic link"), either of which completes sign-in. Running the magic-link and
 * OTP plugins side by side would each send their own email — the D6 gotcha.
 */
/**
 * Build the diner OTP "one-click link" against the **tenant the request came
 * from** (its `<slug>.<root>` subdomain, where the customer app actually lives),
 * preserving the in-app path (`x-diner-path`, sent by the client) so it returns
 * to the exact table. Cross-origin requests strip the path from `Referer`, hence
 * the explicit header.
 *
 * The customer app is **subdomain-only** — the apex (`CUSTOMER_URL`) is not a
 * routed page (reserved for a future marketing site), so it's used solely to
 * recognize our own hosts, never as a link base. If the tenant can't be
 * determined we return undefined and the email goes out **code-only** (never a
 * dead apex link).
 */
function customerMagicLink(
  ctx: { headers?: Headers } | undefined,
  email: string,
  otp: string
): string | undefined {
  const rootHost = env.CUSTOMER_URL ? new URL(env.CUSTOMER_URL).host : undefined
  const origin = ctx?.headers?.get("origin") || undefined
  if (!rootHost || !origin) return undefined

  let base: string | undefined
  let next: string | undefined
  try {
    const o = new URL(origin)
    // Trust only our own hosts: the root or one of its `<slug>.<root>` tenants.
    if (o.host === rootHost || o.host.endsWith(`.${rootHost}`)) {
      base = `${o.protocol}//${o.host}`
      const path = ctx?.headers?.get("x-diner-path") || undefined
      // Keep a same-app relative path (the table); never `/giris` (loop) or "/".
      if (
        path &&
        path.startsWith("/") &&
        !path.startsWith("//") &&
        !path.startsWith("/giris") &&
        path !== "/"
      ) {
        next = path
      }
    }
  } catch {
    /* untrusted/garbage origin → code-only */
  }

  if (!base) return undefined
  const params = new URLSearchParams({ email, otp })
  if (next) params.set("next", next)
  return `${base}/giris?${params.toString()}`
}

export const customerAuth = betterAuth({
  ...sharedOptions("cust"),
  basePath: "/api/auth/customer",
  ...(googleCredentials
    ? { socialProviders: { google: googleCredentials } }
    : {}),
  plugins: [
    emailOTP({
      sendVerificationOTP: async ({ email, otp }, ctx) => {
        const link = customerMagicLink(ctx, email, otp)
        const message = await renderPasswordlessEmail({ link, code: otp })
        await getEmailSender().send({ to: email, ...message })
      },
    }),
    // Optional passkeys for returning diners (register while signed in).
    passkey({
      rpID: passkeyRpId(env.CUSTOMER_URL),
      rpName: "Menü",
      schema: { passkey: { modelName: "cust_passkey" } },
    }),
  ],
})

/** A Better Auth instance shape, narrowed for the guard factory + mounts. */
export type AuthInstance =
  | typeof adminAuth
  | typeof dashboardAuth
  | typeof customerAuth
