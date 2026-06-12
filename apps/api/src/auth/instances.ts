import { betterAuth, type BetterAuthOptions } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { emailOTP } from "better-auth/plugins"

import { prisma } from "@repo/db"

import {
  getEmailSender,
  renderPasswordlessEmail,
  renderPasswordResetEmail,
} from "./email"
import { googleCredentials, rootDomain, trustedOrigins } from "./env"

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
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins,
    // Isolated identity tables per audience.
    user: { modelName: `${prefix}_user` },
    session: { modelName: `${prefix}_session` },
    account: { modelName: `${prefix}_account` },
    verification: { modelName: `${prefix}_verification` },
    // Window-based throttling (decays — never a permanent lockout, D8). Each
    // instance keeps its own table to avoid cross-audience key collisions.
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: `${prefix}_rate_limit`,
      customRules: { "/sign-in/email": { window: 10, max: 5 } },
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
export const customerAuth = betterAuth({
  ...sharedOptions("cust"),
  basePath: "/api/auth/customer",
  ...(googleCredentials
    ? { socialProviders: { google: googleCredentials } }
    : {}),
  plugins: [
    emailOTP({
      sendVerificationOTP: async ({ email, otp }) => {
        const base = process.env.CUSTOMER_URL ?? ""
        const link = base
          ? `${base}/giris?email=${encodeURIComponent(email)}&otp=${otp}`
          : undefined
        const message = await renderPasswordlessEmail({ link, code: otp })
        await getEmailSender().send({ to: email, ...message })
      },
    }),
  ],
})

/** A Better Auth instance shape, narrowed for the guard factory + mounts. */
export type AuthInstance =
  | typeof adminAuth
  | typeof dashboardAuth
  | typeof customerAuth
