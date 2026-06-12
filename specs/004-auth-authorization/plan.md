# Implementation Plan: Authentication & Authorization

**Branch**: `004-auth-authorization` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-auth-authorization/spec.md`

## Summary

Add authentication and authorization across the three apps with deliberately separate audiences. **Better Auth runs inside the NestJS API** (the sole DB owner), reusing the existing Prisma 7 driver-adapter client, as **three isolated instances** — `admin`, `dashboard`, `customer` — each with its own cookie prefix, base path, and identity tables so sessions can never cross-authorize. Sign-in methods per audience: admin = single seeded email+password (sign-up disabled); dashboard = email+password (verification-gated), accounts born only via invitation; customer = optional Google + passwordless email (one email carrying both a magic link and an OTP), account-linked to one identity. **Restaurant membership, roles, and invitations are our own schema-first domain** (Prisma models on the existing `Restaurant`, `@repo/schemas` contract, `ErrorCode`/`@repo/i18n`, `apiFetch`), keeping one source of truth for "restaurant" and honoring the schema-first contract; Better Auth supplies only identity/credentials/verification. The keystone flow — admin invites an owner → owner verifies email and sets a password → scoped dashboard access — is orchestrated server-to-server. See [research.md](./research.md) for the decision record.

## Technical Context

**Language/Version**: TypeScript (strict, `NodeNext`, `noUncheckedIndexedAccess`), Node; NestJS 11 (Express 5) API, Next.js 16 apps.

**Primary Dependencies**: `better-auth` (catalog-pinned) on API + each Next client; `@better-auth/cli` (dev, schema generation); existing Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`), Zod 4, TanStack Query, react-hook-form. Plugins: email-password, magic-link, email-OTP, Google social, account linking, rate limit. **No** organization/admin plugin (D5/D7).

**Storage**: Postgres 18 via `@repo/db`. New tables: per-instance Better Auth identity tables (generated) + `restaurant_members`, `restaurant_invitations` (hand-authored). See [data-model.md](./data-model.md).

**Testing**: Jest unit (`*.spec.ts`) + e2e (`test/*.e2e-spec.ts`) in the API for membership/invitation services and contract tests; `pnpm lint`/`typecheck` gates.

**Target Platform**: Web (three Next apps + one API). Dev ports api 3000 / dashboard 3001 / customer 3002 / admin 3003.

**Project Type**: Turborepo monorepo (apps + shared packages).

**Performance Goals**: Standard web auth latency; `/get-session` on the hot path for protected requests (consider Better Auth cookie-cache later, off by default).

**Constraints**: API is the only DB toucher; client↔server contract through `@repo/schemas`; same-site cookies (dev localhost, prod `api.<ROOT_DOMAIN>` + `crossSubDomainCookies`); CORS must add `credentials: true`; CSRF via `trustedOrigins`. No paid channels (phone out of scope).

**Scale/Scope**: One platform admin; tens–hundreds of restaurants; small team per restaurant; diners unbounded but optional/non-gating.

## Constitution Check

*GATE: re-checked after Phase 1 design — PASS.*

- **I. Schema-First Contract (NON-NEGOTIABLE)** — PASS. All **custom** endpoints (membership, invitations, acceptance) go through `@repo/schemas` + `ZodValidationPipe` + `ErrorCode`/`HttpExceptionFilter` + `apiFetch`, with Turkish mappings in `@repo/i18n`. The **Better Auth endpoint surface** is consumed via Better Auth's own end-to-end-typed client — explicitly exempt under the "Boundary scope" bullet added in constitution **v1.1.0**. We chose the custom membership domain specifically to keep the large authorization surface on-contract.
- **II. Strict Layering & Dependency Direction** — PASS. Better Auth lives only in `apps/api`; it is the sole DB toucher (reuses `@repo/db`). Next apps consume it as clients. New shared schemas go in `@repo/schemas` (which may depend on `@repo/core`).
- **III. Type Safety & Boundary Validation** — PASS. Strict TS throughout; all external input (invitation tokens, request bodies, sessions) validated at the boundary (Zod for our endpoints; Better Auth validates its own). No suppressions planned.
- **IV. Test Discipline for Contracts & Services** — PASS. Membership/invitation services and the new contract endpoints get unit + e2e coverage (last-owner, role checks, invitation lifecycle, cross-restaurant denial). Better Auth internals are not re-tested; our integration of them is.
- **V. Localization & Convention Consistency** — PASS. New `ErrorCode`s get Turkish strings in `@repo/i18n`; UI composes `@repo/ui`; catalog-pinned `better-auth`; Prettier/lint gates. Auth UI forms follow the existing react-hook-form + Zod locale pattern.

No unjustified violations. The single deviation is recorded below.

## Project Structure

### Documentation (this feature)

```text
specs/004-auth-authorization/
├── plan.md              # This file
├── spec.md
├── research.md          # Phase 0 decision record (D1–D9)
├── data-model.md        # Identity tables + custom membership/invitation domain
├── quickstart.md        # End-to-end validation guide
├── contracts/
│   ├── auth-endpoints.md   # Better Auth surface (per instance)
│   └── api-contracts.md    # Custom schema-first membership/invitation API
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/api/                                  # Better Auth host + custom auth domain
├── src/
│   ├── auth/
│   │   ├── instances.ts                   # adminAuth / dashboardAuth / customerAuth (betterAuth(...))
│   │   ├── auth.mount.ts                  # toNodeHandler mounts (raw body) + scoped json
│   │   ├── auth-guard.factory.ts          # createAuthGuard(instance) → Admin/Dashboard/CustomerAuthGuard
│   │   ├── email/                         # combined magic-link+OTP + invitation emails
│   │   └── seed-admin.ts                  # idempotent single-admin bootstrap (pnpm seed:admin)
│   ├── members/                           # RestaurantMember service + controller (membership, roles)
│   ├── invitations/                       # RestaurantInvitation service + controller (admin + owner)
│   ├── prisma/prisma.service.ts           # + restaurantMember, restaurantInvitation delegates
│   └── main.ts                            # bodyParser:false; CORS + credentials:true
└── test/                                  # *.e2e-spec.ts contract tests

packages/db/prisma/schema.prisma           # + generated BA tables + RestaurantMember/Invitation, enums
packages/schemas/src/                       # invitation/member schemas + new ErrorCodes
packages/i18n/src/                          # Turkish messages for new ErrorCodes

apps/admin/                                 # admin auth client + sign-in + invite-owner UI
├── lib/auth-client.ts                      # createAuthClient(basePath /api/auth/admin)
└── features/invitations/                   # api.ts/queries.ts/use-*.ts (apiFetch), invite UI

apps/dashboard/                             # dashboard auth client + sign-in + accept-invite + members UI
├── lib/auth-client.ts                      # basePath /api/auth/dashboard
├── proxy.ts                                # add optimistic getSessionCookie({cookiePrefix:'dash'}) gate
└── features/{members,invitations}/         # apiFetch wrappers + UI

apps/customer/                              # customer auth client (optional sign-in)
└── lib/auth-client.ts                      # basePath /api/auth/customer (Google + magic-link/OTP)
```

**Structure Decision**: Monorepo, extending existing apps/packages. Auth concerns are concentrated in `apps/api/src/auth/` (the only DB toucher); membership/invitation are ordinary schema-first domains in the API with thin `features/<name>/` clients in admin/dashboard, exactly per the established convention. No new package is introduced.

## Complexity Tracking

| Deviation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Three Better Auth instances (vs one) | Hard, structural guarantee that admin/dashboard/customer sessions never cross-authorize (FR-021/FR-022), confirmed with user | One instance + role guards leaves separation to never-forgetting application logic — higher cross-auth risk for a security boundary. |

> Note: the Better Auth client consuming the auth surface outside `apiFetch` is **not** a deviation as of constitution v1.1.0 — Principle I's "Boundary scope" bullet explicitly exempts vendored auth-library clients. All custom membership/invitation endpoints remain on-contract.
