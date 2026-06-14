import { z } from "zod"

/**
 * The API's environment contract — the single source of truth for which vars
 * exist, their type, and whether they're required. `process.env` is parsed once
 * at import; every other module reads the typed `env` export instead of touching
 * `process.env` directly, so removing a key here surfaces as a compile error at
 * each stale read.
 *
 * Validation fails fast at boot (wired via `ConfigModule.forRoot({ validate })`
 * in `app.module.ts`). The better-auth schema-gen CLI imports the auth subtree
 * without a full env, so set `SKIP_ENV_VALIDATION=true` on those commands to
 * fall back to a lenient (unparsed) view — see `auth/schema-gen/*`.
 */
const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(3000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),

    // Database (also consumed by @repo/db's Prisma adapter).
    DATABASE_URL: z.string().min(1),

    // App origins — drive CORS (main.ts) and auth trusted origins (auth/env.ts).
    ADMIN_URL: z.url(),
    DASHBOARD_URL: z.url(),
    CUSTOMER_URL: z.url(),
    // Registrable root domain in prod (cross-subdomain cookies); unset in dev.
    ROOT_DOMAIN: z.string().optional(),

    // Object storage (MinIO dev / R2 prod). Optional so the app still boots
    // without media configured; required together in prod (refine below).
    S3_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    MEDIA_PUBLIC_BASE_URL: z.url().optional(),

    // Better Auth.
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
    ADMIN_BOOTSTRAP_EMAIL: z.email().optional(),
    ADMIN_BOOTSTRAP_PASSWORD: z.string().optional(),
    // Google sign-in is enabled iff both are set.
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Transactional email.
    EMAIL_TRANSPORT: z.enum(["console", "smtp", "resend"]).default("console"),
    EMAIL_FROM: z.email().optional(),
    RESEND_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    // Conditional email requirements (moved forward from getEmailSender()).
    if (env.EMAIL_TRANSPORT === "resend" && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "Required when EMAIL_TRANSPORT=resend",
      })
    }
    if (env.EMAIL_TRANSPORT === "smtp" && !env.SMTP_HOST) {
      ctx.addIssue({
        code: "custom",
        path: ["SMTP_HOST"],
        message: "Required when EMAIL_TRANSPORT=smtp",
      })
    }
    if (env.EMAIL_TRANSPORT !== "console" && !env.EMAIL_FROM) {
      ctx.addIssue({
        code: "custom",
        path: ["EMAIL_FROM"],
        message: `Required when EMAIL_TRANSPORT=${env.EMAIL_TRANSPORT}`,
      })
    }

    // Production hardening: storage must be fully configured and the auth secret
    // long enough to be meaningful. Dev stays lenient.
    if (env.NODE_ENV === "production") {
      const s3 = {
        S3_ENDPOINT: env.S3_ENDPOINT,
        S3_REGION: env.S3_REGION,
        S3_BUCKET: env.S3_BUCKET,
        S3_ACCESS_KEY_ID: env.S3_ACCESS_KEY_ID,
        S3_SECRET_ACCESS_KEY: env.S3_SECRET_ACCESS_KEY,
        MEDIA_PUBLIC_BASE_URL: env.MEDIA_PUBLIC_BASE_URL,
      }
      for (const [key, value] of Object.entries(s3)) {
        if (!value) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Required in production",
          })
        }
      }
      if (env.BETTER_AUTH_SECRET.length < 32) {
        ctx.addIssue({
          code: "custom",
          path: ["BETTER_AUTH_SECRET"],
          message: "Must be at least 32 characters in production",
        })
      }
    }
  })

export type Env = z.infer<typeof schema>

function load(): Env {
  // Lenient, live `process.env` view for contexts that import this module
  // without a full env and never run the server: the better-auth schema-gen CLI
  // (`SKIP_ENV_VALIDATION=true`) and Jest (`NODE_ENV==="test"`, which also lets
  // specs mutate env at runtime). Coerced defaults/types are not applied here.
  if (
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.NODE_ENV === "test"
  ) {
    return process.env as unknown as Env
  }
  const result = schema.safeParse(process.env)
  if (result.success) return result.data
  throw new Error(`Invalid API environment:\n${z.prettifyError(result.error)}`)
}

export const env = load()
