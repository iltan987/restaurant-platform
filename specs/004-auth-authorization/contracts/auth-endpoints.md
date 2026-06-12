# Contract: Better Auth endpoint surface (per instance)

Better Auth exposes its own typed endpoints, consumed on the frontend via its **own** client (`createAuthClient`), not via `apiFetch`. This is the one localized deviation from Constitution Principle I (justified in plan Constitution Check): the auth library is an end-to-end-typed boundary of its own. Everything **we** build stays on the `@repo/schemas`/`apiFetch` contract — see `api-contracts.md`.

Three instances, three base paths. Clients send `credentials: "include"`.

## admin — basePath `/api/auth/admin` (cookiePrefix `pa`)
| Endpoint | Purpose |
| --- | --- |
| `POST /sign-in/email` | Admin sign-in (rate-limited, D8). |
| `POST /sign-out` | End admin session. |
| `GET /get-session` | Validate/read admin session (used by `AdminAuthGuard` and admin RSC). |

Sign-up is **disabled**. The single admin is seeded server-side (D7). No password-reset surface exposed by default (recoverable via re-seed/server call).

## dashboard — basePath `/api/auth/dashboard` (cookiePrefix `dash`)
| Endpoint | Purpose |
| --- | --- |
| `POST /sign-in/email` | Owner/member sign-in (requires verified email). |
| `POST /sign-out` | End session. |
| `GET /get-session` | Validate/read session (`DashboardAuthGuard`, dashboard RSC). |
| `POST /request-password-reset` · `POST /reset-password` | Set/reset password — the path used to establish an invited user's first password (D5). |
| (verification) | Email verification backing invitation acceptance. |

Public sign-up is **not** exposed; dashboard accounts come into existence only through invitation acceptance (`api-contracts.md`).

## customer — basePath `/api/auth/customer` (cookiePrefix `cust`)
| Endpoint | Purpose |
| --- | --- |
| `GET /sign-in/social` (Google) + callback | OAuth sign-in. |
| `POST /sign-in/magic-link` | Send the passwordless email (combined link **+** code, D6). |
| `GET /magic-link/verify` | Complete sign-in via link. |
| `POST /email-otp/send-verification-otp` · `POST /sign-in/email-otp` | OTP path (same email as the link). |
| `POST /sign-out` · `GET /get-session` | Session lifecycle (non-gating; `CustomerAuthGuard` is optional). |

Account linking (verified-email) on by default → one `cust_user` per verified email (D6).

## Server-side (NestJS) usage
- Guards: `instance.api.getSession({ headers })` → `{ session, user } | null`. Guard factory `createAuthGuard(instance)` yields `AdminAuthGuard`, `DashboardAuthGuard`, `CustomerAuthGuard`.
- Admin-orchestrated flows call `dashboardAuth.api.*` / Better Auth server APIs **server-to-server** (no session needed) — e.g. creating an invited user / triggering verification during owner onboarding.

## Cross-cutting config (all instances)
- `secret` (`BETTER_AUTH_SECRET`), explicit `baseURL`, explicit `basePath`.
- `trustedOrigins`: admin/dashboard/customer origins + `https://*.<ROOT_DOMAIN>` tenant wildcard.
- `advanced.crossSubDomainCookies` (prod) + `advanced.cookiePrefix` (per instance).
- `rateLimit: { enabled: true, storage: "database", customRules: { "/sign-in/email": ... } }`.
- NestJS CORS extended with `credentials: true`.
