# Tasks: Authentication & Authorization

**Feature**: `004-auth-authorization` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

**Inputs**: research.md (D1–D9), data-model.md, contracts/{auth-endpoints,api-contracts}.md, quickstart.md

**Tests**: Included — Constitution Principle IV mandates test coverage for the client↔server contract and backend services (membership/invitation logic, authorization). Better Auth internals are not re-tested; our integration of them is.

**Conventions**: NestJS api is the sole DB owner; Better Auth hosted there as three instances; membership/invitation is a schema-first domain. Paths follow plan.md Project Structure. `[P]` = parallelizable (different files, no incomplete dependency).

---

## Phase 1: Setup

- [X] T001 Add `better-auth` and `nodemailer` (+ `@types/nodemailer`) to `pnpm-workspace.yaml` `catalog:`, then reference `"better-auth": "catalog:"` in `apps/api/package.json`, `apps/admin/package.json`, `apps/dashboard/package.json`, `apps/customer/package.json` (and `nodemailer`, `@types/nodemailer` in `apps/api/package.json`); run `pnpm install`. **Note:** the Better Auth CLI is no longer the standalone `@better-auth/cli` package — it now ships as `auth` and is run via `pnpm dlx auth@latest …` (see T006), so it is **not** a project dependency.
- [X] T002 [P] Extend `apps/api/.env.example` with `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and email-transport vars: `EMAIL_TRANSPORT` (`console` | `smtp`), and for `smtp`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`; mirror real values into `apps/api/.env` (`EMAIL_TRANSPORT=console` for local dev).
- [X] T003 [P] Confirm `NEXT_PUBLIC_API_URL` is present in `apps/admin/.env.example`, `apps/dashboard/.env.example`, `apps/customer/.env.example` (used as each Better Auth client `baseURL`); add if missing. *(All three already had it.)*
- [X] T004 [P] Add a `ROOT_DOMAIN` (prod) note/var to `apps/api/.env.example` for `crossSubDomainCookies` and `trustedOrigins` wildcard usage.

---

## Phase 2: Foundational (BLOCKING — must complete before any user story)

**Purpose**: Stand up the three Better Auth instances, their tables, mounting, guards, shared email + error plumbing. Nothing in Phase 3+ works without this.

- [X] T005 Define the three Better Auth instances in `apps/api/src/auth/instances.ts` — `adminAuth` (email+password, `disableSignUp`, basePath `/api/auth/admin`, cookiePrefix `pa`, modelName `admin_*`), `dashboardAuth` (email+password, `requireEmailVerification`, basePath `/api/auth/dashboard`, cookiePrefix `dash`, modelName `dash_*`), `customerAuth` (Google + magicLink + emailOTP + account linking, basePath `/api/auth/customer`, cookiePrefix `cust`, modelName `cust_*`). All share `secret`, explicit `baseURL`, `trustedOrigins` (app origins + `https://*.<ROOT_DOMAIN>`), `rateLimit: { enabled: true, storage: "database", customRules: { "/sign-in/email": ... } }`, and `prismaAdapter(prisma, { provider: "postgresql" })` importing `prisma` from `@repo/db`. (See research D1/D3/D6/D7/D8, contracts/auth-endpoints.md.)
- [X] T006 Generate Better Auth tables into the existing schema. **The CLI resolves one `auth` export per `--config`, so each instance is generated separately** via the re-export shims in `apps/api/src/auth/schema-gen/{admin,dashboard,customer}.ts` (runs accumulate into the schema): `pnpm dlx auth@latest generate --config apps/api/src/auth/schema-gen/<aud>.ts --output packages/db/prisma/schema.prisma --yes` ×3, review the diff, then `pnpm --filter @repo/db exec prisma migrate dev --name add_auth_tables` and `db:generate`. Produced 15 models (`{admin,dash,cust}_{user,session,account,verification,rate_limit}`). Better Auth supplies IDs in app code, so generated `id` columns have no `@default` (cuid(2) convention does not apply to BA tables). (Depends on T005.)
- [X] T007 Configure mounting in `apps/api/src/main.ts`: create the app with `bodyParser: false`, enable CORS (with `credentials: true`) **first** so raw auth responses carry headers, mount the auth handlers, then re-enable `express.json()`/`urlencoded()` for the rest. (Depends on T005.) *Note: added `express` as an explicit api dependency (we mount via the raw Express instance with `.all(...*splat)`).*
- [X] T008 Mount the three handlers in `apps/api/src/auth/auth.mount.ts` via `toNodeHandler(instance)` for `/api/auth/admin/*splat`, `/api/auth/dashboard/*splat`, `/api/auth/customer/*splat` (Express 5 splat, on the raw instance with `.all()` so the path isn't stripped). Each instance's `basePath` is the full real path and `BETTER_AUTH_URL` is the origin **without** `/api`, so the Nest global prefix never collides. (Depends on T005, T007.)
- [X] T009 [P] Create the guard factory `apps/api/src/auth/auth-guard.factory.ts` → `createAuthGuard(instance)` producing `AdminAuthGuard`, `DashboardAuthGuard`, `CustomerAuthGuard` (the customer one optional/non-throwing), each calling `instance.api.getSession({ headers })` (via `fromNodeHeaders`) and attaching `{ session, user }` to `req.auth`. (Depends on T005.)
- [X] T010 [P] Build a provider-agnostic `EmailSender` in `apps/api/src/auth/email/` selected by `EMAIL_TRANSPORT`: a `ConsoleEmailSender` (dev — logs recipient, link, and code) and an SMTP adapter (Nodemailer). Added `renderPasswordlessEmail({ link?, code? })` (combined-capable) + `renderInvitationEmail`. The actual single-email merge of the two customer plugin callbacks is finalized in T040. (See research D6.)
- [X] T011 [P] Add new `ErrorCode`s to `@repo/schemas` (`INVITATION_NOT_FOUND`, `INVITATION_EXPIRED`, `INVITATION_ALREADY_USED`, `INVITATION_REVOKED`, `INVITATION_NOT_PENDING`, `NOT_A_MEMBER`, `INSUFFICIENT_ROLE`, `LAST_OWNER`; reuse `RESTAURANT_NOT_FOUND` if present) in the canonical `ErrorCode` enum. (See contracts/api-contracts.md.)
- [X] T012 [P] Add Turkish messages for each new `ErrorCode` in `@repo/i18n` `getErrorMessage`. (Depends on T011.)
- [X] T013 Verify `apps/api` builds and boots with all three instances mounted, `/api/auth/{admin,dashboard,customer}/get-session` reachable and returning `null` unauthenticated. **Verified**: all three return `null`/200; `/api/auth/admin/ok` → `{ok:true}`; raw-body POST `sign-in/email` → `401 INVALID_EMAIL_OR_PASSWORD` (body parsed, no hang); CORS preflight emits `Access-Control-Allow-Credentials: true`; existing routes unaffected. (Depends on T006, T008, T009.)

**Checkpoint**: Auth infrastructure live; user-story phases can begin.

---

## Phase 3: User Story 1 — Secure platform admin access (P1) 🎯 MVP

**Goal**: The single admin signs in to the admin panel; everything admin is closed to everyone else; works local or remote; throttled but never permanently locked out.

**Independent test**: Provision the admin, sign in, reach restaurant management, sign out, confirm every admin route/action is rejected unauthenticated; exceed sign-in attempts → throttled → recovers after the window.

- [X] T014 [US1] Idempotent single-admin bootstrap in `apps/api/src/auth/seed-admin.ts` + `seed:admin` script. **Creation path:** `adminAuth` has `disableSignUp:true`, so the seed provisions the one admin through a throwaway instance over the same `admin_*` tables (sign-up enabled, `autoSignIn:false`) calling `signUpEmail` — hashes the password + creates the credential account correctly. Verified live: 1st run creates, 2nd run reports "already exists" (one `admin_user` + one `credential` account).
- [X] T015 [US1] Applied `AdminAuthGuard` (class-level) to all management controllers (activity, allergens, areas, categories, floors, tables, availability, media, menu-items, option-groups, tags) + method-level on restaurants. The **3 storefront reads stay public** via a new `@Public()` decorator honored by the guard (`GET /menu/by-slug/:slug`, `GET /restaurants/:slug`, `GET /restaurants/:slug/tables/:tableId`). Existing e2e suites add `.overrideGuard(AdminAuthGuard)`. Verified live: guarded → 401 unauth, public → 404 not 401, authed admin → 200.
- [X] T016 [P] [US1] Admin Better Auth client in `apps/admin/lib/auth-client.ts`. `baseURL` is the API **origin** (strip `/api` from `NEXT_PUBLIC_API_URL`) since `basePath` already carries `/api/auth/admin`; `credentials: "include"`.
- [X] T017 [US1] Admin sign-in page (`app/sign-in/page.tsx`, react-hook-form + Zod), sign-out (topbar), and optimistic route protection in `apps/admin/proxy.ts` (`getSessionCookie({ cookiePrefix: "pa" })` → redirect `/sign-in`). Server validation is the `AdminAuthGuard` on every data call. *(Also set `declaration:false` in the shared Next tsconfig to avoid TS2742 on the Better Auth client's inferred type.)*
- [X] T018 [P] [US1] Unit test `apps/api/src/auth/seed-admin.spec.ts` — skipped/created/exists idempotency + normalized-email lookup (4 tests).
- [X] T019 [US1] E2e `apps/api/test/admin-auth.e2e-spec.ts`: guarded read+mutation → 401 unauthenticated; valid admin session admitted; `@Public()` storefront reads open (SC-001, FR-002/011). **Testing note:** Better Auth is ESM-only and can't load under Jest's CommonJS runtime, so it's mapped to `test/better-auth.mock.ts` (controllable session). The test drives the **real `AdminAuthGuard`**; Better-Auth-native behaviors (sign-in/out, rate-limit 429+recovery → SC-007, no-enumeration → FR-026) are configured on the instance and **verified against a live server** (unknown-email and wrong-password both return `401 INVALID_EMAIL_OR_PASSWORD`), not under Jest.

**Checkpoint**: Admin panel is securely gated — a deployable MVP on its own.

---

## Phase 4: User Story 2 — Restaurant owner onboarding by invitation (P2)

**Goal**: Admin invites an owner by email → owner verifies (link or code), sets a password, signs in to a dashboard scoped to only their restaurant.

**Independent test**: From seeded admin + restaurant, send invite → accept via verification → set password → sign in to dashboard → see only that restaurant; reused/expired/revoked tokens rejected; cross-restaurant access denied.

- [X] T020 [US2] Add `RestaurantRole` + `InvitationStatus` enums and `RestaurantMember` / `RestaurantInvitation` models (with relations on `Restaurant`, `@@map`, indexes, `cuid(2)`) to `packages/db/prisma/schema.prisma`; migrate (`db:migrate`) and regenerate (`db:generate`). (See data-model.md.)
- [X] T021 [US2] Add `restaurantMember` and `restaurantInvitation` delegates to `apps/api/src/prisma/prisma.service.ts`. (Depends on T020.)
- [X] T022 [P] [US2] Add invitation + membership Zod schemas/types to `@repo/schemas` (invite-owner body, accept body `{ password }`, invitation lookup response, membership shapes) per contracts/api-contracts.md.
- [X] T023 [US2] Implement `apps/api/src/invitations/` service: create owner invitation (hash unguessable single-use token, set TTL, cancel prior pending for the pair), get-by-token (hash compare + lazy expiry), revoke, and accept (transactional: ensure/create `dash_user`, set first password via Better Auth server API, create `RestaurantMember`, mark `ACCEPTED`). (Depends on T020–T022, T010.)
- [X] T024 [US2] Implement the invitations controller endpoints with `ZodValidationPipe`: `POST /api/admin/restaurants/:id/invitations` + `GET` list + `DELETE /api/admin/invitations/:id` (guard `AdminAuthGuard`); `GET /api/invitations/:token` + `POST /api/invitations/:token/accept` (public/token). Send the combined invite email. (Depends on T023; uses T009/T010.)
- [X] T025 [US2] Implement `GET /api/me/restaurants` (membership list + role) guarded by `DashboardAuthGuard` in `apps/api/src/members/`. (Depends on T021.)
- [X] T026 [US2] Enforce membership-scoped authorization: a reusable helper/guard that resolves `RestaurantMember` for `(restaurantId, session.userId)` and denies (`NOT_A_MEMBER`) at the data layer; apply to dashboard restaurant-scoped routes. (Depends on T021, T009.)
- [X] T027 [P] [US2] Create the dashboard Better Auth client in `apps/dashboard/lib/auth-client.ts` (basePath `/api/auth/dashboard`, `credentials: include`).
- [X] T028 [US2] Build the dashboard sign-in page + sign-out and route protection (optimistic `getSessionCookie({ cookiePrefix: "dash" })` in `apps/dashboard/proxy.ts` + server validation). (Depends on T027.)
- [X] T029 [US2] Build the invitation-acceptance page in `apps/dashboard` (`features/invitations/`: `api.ts`/`queries.ts`/`use-*.ts` over `apiFetch`) — token lookup, set-password form, then sign-in. (Depends on T022, T027.)
- [X] T030 [P] [US2] Build the admin invite-owner UI in `apps/admin/features/invitations/` (`api.ts`/`queries.ts`/`use-*.ts` over `apiFetch`, optimistic per existing convention) — invite, list, revoke. (Depends on T022, T016.)
- [X] T031 [P] [US2] Unit test invitation service in `apps/api/src/invitations/invitations.service.spec.ts`: token single-use/hash, expiry, revoke, accept creates member + password.
- [X] T032 [US2] E2e test `apps/api/test/invitations.e2e-spec.ts`: full invite→accept→sign-in; reused/expired/revoked token rejected (each `ErrorCode`); member of A requesting B → denied (SC-002, SC-003, SC-005, FR-005–011).

**Checkpoint**: End-to-end owner onboarding works; dashboard is membership-scoped.

---

## Phase 5: User Story 3 — Restaurant team members and roles (P3)

**Goal**: Owner invites staff with roles; permissions enforced per restaurant; last owner protected; multi-restaurant users isolated.

**Independent test**: Owner invites a `STAFF` member → accept → sign in → owner-only actions denied, permitted ones succeed; change/remove role takes effect; demote/remove sole owner blocked; same user in two restaurants with no leakage.

- [X] T033 [P] [US3] Define the role→permission map in `@repo/schemas` (which actions each `RestaurantRole` may perform) and a typed permission-check helper. (See data-model.md.)
- [X] T034 [US3] Extend `apps/api/src/members/` service with role enforcement (`hasPermission(role, action)` → `INSUFFICIENT_ROLE`), and the member-invite path reusing the invitations service with a chosen role + `invitedByUserId`. (Depends on T033, T023, T026.)
- [X] T035 [US3] Implement member endpoints in the members controller: `POST /api/restaurants/:id/members/invitations` (owner-only), `GET /api/restaurants/:id/members`, `PATCH .../members/:userId` (role change), `DELETE .../members/:userId` — all `DashboardAuthGuard` + membership-scoped, with **last-owner protection** (`LAST_OWNER`) on demote/remove. (Depends on T034.)
- [X] T036 [US3] Build the dashboard members UI in `apps/dashboard/features/members/` (`api.ts`/`queries.ts`/`use-*.ts` over `apiFetch`) — list, invite-with-role, change role, remove. (Depends on T033, T022.)
- [X] T037 [US3] Add restaurant switching in `apps/dashboard` driven by `GET /api/me/restaurants` for multi-restaurant users (active-restaurant context, no cross-leak). (Depends on T025.)
- [X] T038 [P] [US3] Unit test role enforcement + last-owner invariant in `apps/api/src/members/members.service.spec.ts`.
- [X] T039 [US3] E2e test `apps/api/test/members.e2e-spec.ts`: role-gated actions, role change/remove effect, last-owner rejection, multi-restaurant isolation (FR-012–016).

**Checkpoint**: Multi-member restaurants with enforced RBAC.

---

## Phase 6: User Story 4 — Optional customer sign-in (P4)

**Goal**: Diners browse anonymously; optionally sign in with Google or passwordless email (one email with link + code); same verified email = one identity.

**Independent test**: Browse a menu anonymously (full access); sign in with Google; sign in with email via both the link and the code; Google + email on same address → one `cust_user`.

- [ ] T040 [US4] Wire Google OAuth credentials + callback for the `customerAuth` instance and confirm magic-link + email-OTP both route through the **combined** customer email (reuse T010 helper); verify `account.accountLinking` defaults (no `trustedProviders`/`allowDifferentEmails`). (Instance defined in T005; this configures providers/keys.)
- [ ] T041 [P] [US4] Create the customer Better Auth client in `apps/customer/lib/auth-client.ts` (basePath `/api/auth/customer`, Google + magic-link + email-OTP, `credentials: include`).
- [ ] T042 [US4] Build optional customer sign-in UI in `apps/customer` (Google button + email entry that triggers the combined send; accept either link or code) WITHOUT gating menu browsing — anonymous access stays fully functional. (Depends on T041.)
- [ ] T043 [US4] Confirm menu/storefront routes remain public (no `CustomerAuthGuard` on browsing) and that an optional guard exists for future per-user features only. (Depends on T009.)
- [ ] T044 [US4] E2e test `apps/api/test/customer-auth.e2e-spec.ts`: anonymous browse works; Google sign-in; email link and code each complete; Google+email same address → single identity (no duplicate); **passwordless-email request for an unknown vs known address yields indistinguishable responses (no enumeration, FR-026)** (SC-004, SC-005, FR-017–021/026).

**Checkpoint**: Optional diner identity established; browsing untouched.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T045 [P] Configure production cookie strategy in `apps/api/src/auth/instances.ts`: `advanced.crossSubDomainCookies: { enabled: true, domain: ROOT_DOMAIN }` and finalize `trustedOrigins`/CORS for `api.<ROOT_DOMAIN>` + tenant subdomains (research D4); document the different-domain proxy fallback.
- [ ] T046 [P] Set/confirm session expiry bounds for all three instances and verify sign-out + expiry behavior (FR-022–024); document audience-isolation behavior.
- [ ] T047 [P] Cross-audience isolation e2e in `apps/api/test/audience-isolation.e2e-spec.ts`: an admin cookie presented to dashboard/customer get-session is unauthorized, and vice-versa (SC-006).
- [ ] T048 [P] Localization & UX pass: confirm every new `ErrorCode` maps to a Turkish message and auth/error states render via `@repo/ui` + `getErrorMessage`.
- [ ] T049 Run the full `quickstart.md` validation end-to-end against a clean DB.
- [ ] T050 Run quality gates: `pnpm lint`, `pnpm typecheck`, `pnpm format`, `pnpm --filter api test`, `pnpm --filter api test:e2e` — all green.

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** → **Phase 2 (Foundational, BLOCKING)** → **Phase 3+**.
- **User Story order**: US1 (P1) → US2 (P2) → US3 (P3) → US4 (P4).
- **Story independence**:
  - **US1** depends only on Foundational — fully independent MVP.
  - **US2** depends on Foundational (and is more demonstrable after US1 exists to issue invites, but is independently testable with a seeded admin/restaurant).
  - **US3** builds on US2's membership/invitation domain (T020–T026) — start after US2's data layer lands.
  - **US4** depends only on Foundational (customer instance) — independent of US2/US3; can run in parallel with them.
- **Within a story**: schemas/models → service → controller/endpoints → client/UI → tests.

## Parallel Execution Opportunities

- **Setup**: T002, T003, T004 in parallel after T001.
- **Foundational**: after T005, T009/T010/T011 in parallel; T012 after T011. (T006→T007→T008 are sequential.)
- **US1**: T016 ∥ T018 alongside T014/T015; T019 last.
- **US2**: T022 ∥ T027; T030 ∥ T029 (different apps); T031 ∥ implementation; T032 last.
- **US3**: T033 first, then T038 ∥ T036; T039 last.
- **US4**: T041 ∥ T040; can proceed concurrently with US2/US3 (separate customer instance + app).
- **Polish**: T045–T048 largely parallel; T049/T050 last.

## Implementation Strategy

- **MVP = Phase 1 + Phase 2 + Phase 3 (US1)**: a securely gated admin panel — the smallest deployable, valuable slice.
- **Increment 2 = US2**: the keystone owner-onboarding flow + scoped dashboard.
- **Increment 3 = US3**: team RBAC.
- **Increment 4 = US4**: optional customer identity (parallelizable with 2–3).
- Foundational is the one hard gate; after it, stories deliver value independently and incrementally.

## Task Summary

- **Total tasks**: 50
- **Per phase**: Setup 4 (T001–T004) · Foundational 9 (T005–T013) · US1 6 (T014–T019) · US2 13 (T020–T032) · US3 7 (T033–T039) · US4 5 (T040–T044) · Polish 6 (T045–T050)
- **Per user story**: US1 = 6, US2 = 13, US3 = 7, US4 = 5
