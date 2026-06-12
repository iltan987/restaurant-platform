# Phase 0 Research: Authentication & Authorization

All findings verified against current Better Auth docs (via the Better Auth docs MCP) on 2026-06-12, and against the repo's existing constraints (NestJS API as sole DB owner, Prisma 7 `prisma-client` generator + `@prisma/adapter-pg`, three Next.js apps on distinct origins, schema-first contract).

---

## D1 — Where Better Auth runs: inside the NestJS API

**Decision**: Host Better Auth **inside `apps/api`** (NestJS 11), reusing the existing `@repo/db` Prisma singleton as its database adapter.

**Why**: The constitution makes the API the **only** component that touches the database (Principle II). Better Auth's Prisma adapter takes a `PrismaClient` instance and only calls model delegates, so it composes with the existing `@prisma/adapter-pg` driver-adapter client unchanged. Running auth anywhere else (e.g. inside each Next app) would mean another DB toucher — a constitution violation.

**How**:
- `prismaAdapter(prisma, { provider: "postgresql" })`, where `prisma` is the existing `@repo/db` singleton (imported from its **custom generated path**, never `@prisma/client` — required under the Prisma 7 `prisma-client` generator).
- Mount each instance's web-standard handler with `toNodeHandler(authInstance)` on an Express route. NestJS 11 runs Express 5 (splat route syntax `*splat`).
- Set `bodyParser: false` at app creation (Better Auth needs the raw body), then re-enable JSON body parsing **scoped to non-auth routes** so existing controllers keep working.
- Set `secret` (`BETTER_AUTH_SECRET`), `baseURL`, and `basePath` explicitly per instance — never rely on inference.

**Alternatives considered**: The community package `@thallesp/nestjs-better-auth` gives a global `AuthGuard` + `@Session()` decorator, but is built around a **single** instance. With three instances (D3) we mount handlers manually and use a small guard factory instead — the package's single global guard does not fit cleanly. We still follow its documented raw-Express pattern.

**Risks/gotchas**: `bodyParser:false` must be paired with scoped JSON re-enable or every other controller loses body parsing; reconcile Better Auth `basePath` with the app's `setGlobalPrefix("api")` so the effective mounted path is exactly what each client's `baseURL`/`basePath` expects (a mismatch breaks OAuth callbacks and CSRF origin checks); watch the repo's known NestJS SWC gotchas (`project_nestjs_swc` memory).

**Docs**: `/docs/integrations/nestjs`, `/docs/integrations/express`, `/docs/installation`, `/docs/adapters/prisma` (Prisma-7 import-path callout), `/docs/reference/options` (`secret`/`baseURL`/`basePath`/`trustedOrigins`).

---

## D2 — Schema generation & migration

**Decision**: Generate Better Auth's models with `@better-auth/cli generate` into the existing `packages/db/prisma/schema.prisma`, then migrate with the repo's own `prisma migrate`.

**Why**: The Better Auth CLI **generates** Prisma models but does **not** migrate Prisma (its programmatic migration is Kysely-only). The repo already owns the `prisma migrate` lifecycle. So Better Auth contributes model definitions; Prisma owns migrations — no new tooling.

**Workflow**: define the three `auth` instances (with all plugins enabled, since plugin tables are only emitted when configured) → run `generate --config <auth file> --output packages/db/prisma/schema.prisma` → `pnpm --filter @repo/db db:migrate` → `db:generate`. Re-run whenever plugins/fields change. Follow the repo's existing conventions in the generated models where possible: `cuid(2)` ids and `@@map` to snake_case plural names, set via each instance's `modelName`/`fields` config.

**Gotchas**: `generate` edits the canonical schema file — review the diff before committing. Custom `modelName`s (needed for D3 per-instance tables) must be set in config so generate honors them.

**Docs**: `/docs/adapters/prisma`, `/docs/concepts/cli`, `/docs/concepts/database`.

---

## D3 — Audience separation: three Better Auth instances

**Decision** (confirmed with user): **Three** Better Auth instances on the one API — `admin`, `dashboard`, `customer` — each with its own `basePath`, `advanced.cookiePrefix`, and its own identity tables (via `modelName`).

| Instance | basePath | cookiePrefix | identity tables | sign-in methods |
| --- | --- | --- | --- | --- |
| admin | `/api/auth/admin` | `pa` | `admin_user/session/account/verification` | email + password (sign-up disabled) |
| dashboard | `/api/auth/dashboard` | `dash` | `dash_user/session/account/verification` | email + password (verification required) |
| customer | `/api/auth/customer` | `cust` | `cust_user/session/account/verification` | Google + magic link + email OTP (passwordless) |

**Why**: Distinct cookie prefixes + basePaths + tables make cross-authorization **structurally impossible** — one instance cannot read or validate another's cookie, and there is no shared user row that could be granted the wrong role. This satisfies FR-021/FR-022 by construction rather than by never-forgetting-a-guard.

**Alternatives considered**: One instance + role/type field + guards (rejected: shared cookie/session namespace, separation rests entirely on application-layer discipline — higher cross-auth risk). Two instances, staff + customer (rejected by user in favor of strict three-way isolation).

**Consequence for guards**: a NestJS guard validates against a **specific** instance via `instance.api.getSession({ headers })`. We provide a guard factory `createAuthGuard(instance)` producing `AdminAuthGuard` / `DashboardAuthGuard` / `CustomerAuthGuard` (the last optional/`@OptionalAuth`-style, since customer sign-in is non-gating).

**Docs**: `/docs/concepts/cookies` (cookie prefix), `/docs/reference/options` (`basePath`, `advanced.cookiePrefix`, `modelName`), `/docs/basic-usage` (`auth.api.getSession`).

---

## D4 — Cross-origin / cross-subdomain cookies

**Decision**: Keep the API **same-site** with the apps. **Dev**: all on `localhost` (same site; different ports are same-site, so `SameSite=Lax` cookies are sent on the cross-port API calls). **Prod**: API on a subdomain of `ROOT_DOMAIN` (e.g. `api.<root>`) with `advanced.crossSubDomainCookies: { enabled: true, domain: "<root>" }`. Per-instance `cookiePrefix` keeps the three audiences distinct even though `localhost` cookies are port-agnostic in dev.

**Why**: Same-site keeps it simple and avoids Safari/ITP cookie blocking, which only strikes when the API is on a **different registrable domain** than the app. Better Auth's `trustedOrigins` (CSRF allowlist) plus the existing NestJS CORS must both list every app origin and tenant subdomain.

**Required config**:
- Better Auth: `trustedOrigins` enumerating the three app origins + `https://*.<root>` tenant wildcard (or the dynamic `baseURL.allowedHosts` form, which auto-adds to trustedOrigins).
- NestJS CORS (extend existing `buildCorsOrigins`): add **`credentials: true`** (currently absent) and ensure per-origin echo (cannot be `*` with credentials).
- Browser: all auth + protected data calls use `credentials: "include"`.

**Fallback**: if an app must live on a **different domain** (e.g. customer on its own brand domain), proxy that app's `/api/auth/*` to the API via a Next rewrite so the API is first-party for it. Documented but kept as fallback, not the default.

**Risks/gotchas**: `crossOriginCookies` (different-domain) is referenced only in the last-login plugin docs and is not a documented primary mechanism — do not rely on it; prefer same-site or proxy. Don't disable CSRF/origin checks.

**Docs**: `/docs/concepts/cookies` (cross-subdomain, Safari/ITP), `/docs/reference/options` (`trustedOrigins`, dynamic `baseURL`), `/docs/reference/security`.

---

## D5 — Membership, roles & invitations: custom schema-first domain

**Decision** (confirmed with user): Better Auth handles **identity, credentials, sessions, OAuth, and email verification only**. Restaurant **membership, roles, and invitations are our own domain**, built schema-first: Prisma models hung off the existing `Restaurant`, schemas + `ErrorCode` in `@repo/schemas`, Turkish messages in `@repo/i18n`, NestJS services, and frontend access via `apiFetch`.

**Why**: The repo already models `Restaurant` as a first-class tenant (subdomain routing, onboarding, menu). The Better Auth **organization plugin** would introduce a parallel `organization` table to map onto it, and route a large surface (invitations/members/roles) through the Better Auth client — bypassing the schema-first contract (Constitution Principle I, NON-NEGOTIABLE). A custom domain keeps **one source of truth** for "restaurant" and keeps the whole membership/invitation surface inside the `@repo/schemas` ⇄ `apiFetch` ⇄ `ErrorCode`/`@repo/i18n` contract.

**What we build**:
- `RestaurantMember` (userId ↔ restaurantId ↔ role) — the basis for all dashboard authorization. `userId` references the **dashboard** instance's user table.
- `RestaurantInvitation` (email, restaurantId, role, status, expiry, single-use token) — covers both **admin→owner** and **owner→member**.
- A role enum/permission map (`OWNER` + at least one lesser role, e.g. `MANAGER`/`STAFF`), evaluated server-side per restaurant.
- Authorization is enforced **at the service/data layer** (every restaurant-scoped query is filtered by the caller's membership), not just hidden in the UI (FR-011).
- **Last-owner protection** and invitation lifecycle (expire/single-use/revoke) are our service logic (these would be custom even with the org plugin).

**Reuse from Better Auth**: invitation acceptance proves email control and sets the owner's first password by funneling the invited user through Better Auth's password set/reset flow (`setPassword` is server-side only; the documented path is request-/reset-password). Verification artifacts (codes/links) reuse Better Auth's email-OTP / magic-link / verification token machinery where it fits; our invitation token is generated unguessably and stored on `RestaurantInvitation`.

**Docs / basis**: `/docs/authentication/email-password` (`setPassword` server-only, reset flow), `/docs/concepts/users-accounts`.

---

## D6 — Customer sign-in: Google + magic link + email OTP, one identity

**Decision**: Customer instance enables **Google** social, **magic link**, and **email OTP** plugins. The passwordless email contains **both** a magic link and a one-time code (either completes sign-in) by merging the two plugin send-callbacks into a **single** email. Account linking (default, verified-email based) ensures Google + email on the same verified address resolve to **one** customer.

**Why**: Magic link and email OTP are independent plugins that coexist; each completes sign-in on its own. Better Auth links a new provider to an existing account when the provider confirms the email as verified — Google's verified email + an OTP-verified email collapse to one identity automatically.

**Gotchas**: each plugin sends its own email by default — suppress one and send a single combined template (pass the OTP via the magic-link callback's `metadata`, or vice-versa). Magic links are strictly single-use (security advisory); default link/OTP expiry ~300s. Leave `trustedProviders`/`allowDifferentEmails` **off** to preserve "one verified email = one identity" and avoid forced-link takeover risk. `disableSignUp` stays off so first-time diners are created on sign-in.

**Phone (out of scope) headroom**: adding a phone provider later is just another linked account on the customer identity — the model does not preclude it (FR-027).

**Docs**: `/docs/plugins/magic-link`, `/docs/plugins/email-otp`, `/docs/concepts/users-accounts` (account linking), social-provider docs.

---

## D7 — Single platform admin

**Decision**: Admin instance uses **email + password with sign-up disabled**, seeded with **exactly one** account via a server-side bootstrap (idempotent seed script / `auth.api` server call). The admin app gates on a valid admin-instance session (and, since only one admin exists, that is sufficient). No admin plugin, no role management surface.

**Why**: For a single pre-provisioned admin with no self-signup and no admin-to-admin invites, the admin plugin (roles/ban/impersonate, extra schema) is overkill and its `setRole` would create a path to mint more admins. Disabling sign-up + a seed is the minimal surface that matches "exactly one, pre-provisioned."

**Bootstrap**: a `pnpm --filter api` seed/script reads admin credentials from env and creates the admin user if absent (idempotent). Documented in quickstart.

**Docs**: `/docs/plugins/admin` (evaluated and rejected as overkill), `/docs/authentication/email-password`.

---

## D8 — Brute-force throttling without permanent lockout

**Decision**: Use Better Auth's built-in, **window-based** rate limiter with `storage: "database"`, tightening the `/sign-in/email` rule. Window counters time-decay, so the sole admin can **never** be permanently locked out (FR-004, SC-007).

**Why**: Better Auth ships a stricter built-in `/sign-in/email` rule (3 req / 10s) on top of the default window; limits reset when the window passes (IP-keyed, IPv6 subnet-normalized) — this is throttling, not account-lockout, which is exactly the "no permanent lockout" property required.

**Gotchas**: rate limiting is **disabled in dev by default** (`rateLimit.enabled: true` to test); in-memory storage doesn't coordinate across instances/restarts → use `storage: "database"`; server-side `auth.api` calls are exempt (a useful admin-recovery safety valve). IP throttling alone won't stop a distributed attack — pair with a strong admin password.

**Docs**: `/docs/concepts/rate-limit`.

---

## D9 — Sessions, sign-out, expiry, contract & i18n

**Decision**: Each instance maintains its own session with a bounded expiry; sign-out ends the current session. Auth/authz failures are surfaced through the platform's existing `{ statusCode, code, message }` contract — new `ErrorCode`s (e.g. invitation expired/used/revoked, not a member, last-owner, cross-restaurant denied, throttled) added in `@repo/schemas` with Turkish mappings in `@repo/i18n`. Better Auth's own endpoints return their native errors; our **custom** membership/invitation endpoints conform to the platform contract. Sign-in/verification responses avoid leaking account existence beyond necessity (FR-026).

**Why**: Consistency with Constitution Principles I & V. Better Auth's auth surface is a library boundary with its own typed client (an acceptable, localized deviation — see plan Constitution Check); everything we build ourselves stays on-contract.

---

## Summary of new dependencies

- `better-auth` (catalog-pinned) — added to `apps/api` (server) and to each Next app (client `createAuthClient`).
- `@better-auth/cli` — dev-time schema generation.
- `nodemailer` (+ `@types/nodemailer`) on the api — SMTP email transport (prod). Email is a provider-agnostic `EmailSender` selected by `EMAIL_TRANSPORT`: `console` for dev (logs link + code), Nodemailer/SMTP for prod (a Resend-style provider is a later drop-in). Zero cost.
- No replacement of Prisma/driver-adapter; no new DB tooling.

All NEEDS CLARIFICATION items from Technical Context are resolved above.
