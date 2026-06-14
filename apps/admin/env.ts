import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

/**
 * The admin app's environment contract. `createEnv` enforces the server/client
 * split at type *and* runtime: `server` vars throw if read in client code, and
 * `client` vars must carry the `NEXT_PUBLIC_` prefix. Every read goes through
 * this `env`, so removing a key surfaces as a compile error at each usage.
 *
 * `HOSTNAME` / `ALLOWED_DEV_ORIGIN` are intentionally absent — they're consumed
 * only by `next.config.mjs` / the dev server, which can't import this TS module.
 */
export const env = createEnv({
  server: {
    // SSR/prefetch API base used when the public host isn't routable from the
    // Next server (WSL/containers). No NEXT_PUBLIC_ prefix → never client-bundled.
    API_INTERNAL_URL: z.url().optional(),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.url(),
    NEXT_PUBLIC_CUSTOMER_URL: z.url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_CUSTOMER_URL: process.env.NEXT_PUBLIC_CUSTOMER_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation:
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.npm_lifecycle_event === "lint",
})
