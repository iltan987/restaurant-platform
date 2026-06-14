import "dotenv/config"

import { betterAuth } from "better-auth"

import { prisma } from "@repo/db"

import { env } from "../config/env"
import { sharedOptions } from "./instances"

/**
 * Idempotent single-platform-admin bootstrap (research D7). The live `adminAuth`
 * instance has `disableSignUp: true`, so we provision the one admin through a
 * throwaway instance over the SAME `admin_*` tables with sign-up enabled — it
 * creates the user + credential account with a correctly hashed password.
 *
 * Safe to run repeatedly: if an `admin_user` with the bootstrap email already
 * exists, it is a no-op.
 *
 * @returns `"created"` when a new admin was provisioned, `"exists"` when one was
 *   already present, `"skipped"` when bootstrap env vars are absent.
 */
export async function seedAdmin(): Promise<"created" | "exists" | "skipped"> {
  const email = env.ADMIN_BOOTSTRAP_EMAIL
  const password = env.ADMIN_BOOTSTRAP_PASSWORD
  if (!email || !password) return "skipped"

  const normalizedEmail = email.trim().toLowerCase()

  const existing = await prisma.admin_user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  })
  if (existing) return "exists"

  // Sign-up-enabled instance over the same tables; `autoSignIn: false` avoids
  // minting a throwaway session during seeding.
  const seedAuth = betterAuth({
    ...sharedOptions("admin"),
    basePath: "/api/auth/admin",
    emailAndPassword: { enabled: true, autoSignIn: false },
  })

  await seedAuth.api.signUpEmail({
    body: { email: normalizedEmail, password, name: "Admin" },
  })

  return "created"
}

/** CLI entrypoint for `pnpm --filter api seed:admin`. */
async function main() {
  const result = await seedAdmin()
  const messages = {
    created: `Admin created for ${env.ADMIN_BOOTSTRAP_EMAIL}.`,
    exists: `Admin already exists for ${env.ADMIN_BOOTSTRAP_EMAIL} — no action.`,
    skipped:
      "ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD not set — nothing to seed.",
  }
  console.log(messages[result])
  await prisma.$disconnect()
}

// Run only when executed directly (not when imported by tests).
if (require.main === module) {
  main().catch((err) => {
    console.error("Admin seed failed:", err)
    process.exitCode = 1
  })
}
