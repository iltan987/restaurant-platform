/**
 * Jest mock for Better Auth. The real package is ESM-only; Jest's CommonJS
 * runtime can't load it (Node's `require(esm)` works in production but Jest uses
 * its own loader). Both jest configs map every `better-auth*` import here via
 * `moduleNameMapper`.
 *
 * Most suites override the audience guard, so they only need this to LOAD. The
 * admin-auth e2e drives the REAL guard against a controllable session set with
 * `__setSession()`. Better Auth's own endpoint behaviors (sign-in, rate-limit,
 * enumeration) are not exercised here — they're verified against a live server.
 */

type MockSession = {
  session: Record<string, unknown>
  user: { id: string; email: string; [key: string]: unknown }
} | null

let currentSession: MockSession = null

/** Control what the guard's `getSession` returns for the next request(s). */
export function __setSession(session: MockSession): void {
  currentSession = session
}

/** Reset mock state (call in beforeEach). */
export function __resetAuthMock(): void {
  currentSession = null
  signUpEmail.mockClear()
}

/** Shared sign-up spy so the seed test can assert it was/wasn't called. */
export const signUpEmail = jest.fn(async () => ({ user: { id: "seeded" } }))

export type BetterAuthOptions = Record<string, unknown>

export function betterAuth(options: BetterAuthOptions) {
  return {
    options,
    handler: async () => new Response("null", { status: 200 }),
    api: {
      getSession: async () => currentSession,
      signUpEmail,
      signInEmail: jest.fn(async () => ({})),
      signOut: jest.fn(async () => ({})),
    },
  }
}

export const prismaAdapter = () => () => ({})

export const toNodeHandler =
  () =>
  (_req: unknown, res: { statusCode: number; end: (b: string) => void }) => {
    res.statusCode = 200
    res.end("null")
  }

export const fromNodeHeaders = () => new Headers()

export const magicLink = (options: unknown) => ({ id: "magic-link", options })
export const emailOTP = (options: unknown) => ({ id: "email-otp", options })
