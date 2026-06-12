# Tasks: Authentication & Authorization

**Feature**: `004-auth-authorization` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

**Inputs**: research.md (D1–D9), data-model.md, contracts/{auth-endpoints,api-contracts}.md, quickstart.md

**Tests**: Included — Constitution Principle IV mandates test coverage for the client↔server contract and backend services (membership/invitation logic, authorization). Better Auth internals are not re-tested; our integration of them is.

**Conventions**: NestJS api is the sole DB owner; Better Auth hosted there as three instances; membership/invitation is a schema-first domain. Paths follow plan.md Project Structure. `[P]` = parallelizable (different files, no incomplete dependency).

---

## Phase 1: Setup

- [ ] T001 Add `better-auth`, `@better-auth/cli`, and `nodemailer` (+ `@types/nodemailer`) to `pnpm-workspace.yaml` `catalog:`, then reference `"better-auth": "catalog:"` in `apps/api/package.json`, `apps/admin/package.json`, `apps/dashboard/package.json`, `apps/customer/package.json` (and `@better-auth/cli`, `nodemailer`, `@types/nodemailer` in `apps/api/package.json`); run `pnpm install`.
- [ ] T002 [P] Extend `apps/api/.env.example` with `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and email-transport vars: `EMAIL_TRANSPORT` (`console` | `smtp`), and for `smtp`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`; mirror real values into `apps/api/.env` (`EMAIL_TRANSPORT=console` for local dev).
- [ ] T003 [P] Confirm `NEXT_PUBLIC_API_URL` is present in `apps/admin/.env.example`, `apps/dashboard/.env.example`, `apps/customer/.env.example` (used as each Better Auth client `baseURL`); add if missing.
- [ ] T004 [P] Add a `ROOT_DOMAIN` (prod) note/var to `apps/api/.env.example` for `crossSubDomainCookies` and `trustedOrigins` wildcard usage.

---

## Phase 2: Foundational (BLOCKING — must complete before any user story)

**Purpose**: Stand up the three Better Auth instances, their tables, mounting, guards, shared email + error plumbing. Nothing in Phase 3+ works without this.

- [ ] T005 Define the three Better Auth instances in `apps/api/src/auth/instances.ts` — `adminAuth` (email+password, `disableSignUp`, basePath `/api/auth/admin`, cookiePrefix `pa`, modelName `admin_*`), `dashboardAuth` (email+password, `requireEmailVerification`, basePath `/api/auth/dashboard`, cookiePrefix `dash`, modelName `dash_*`), `customerAuth` (Google + magicLink + emailOTP + account linking, basePath `/api/auth/customer`, cookiePrefix `cust`, modelName `cust_*`). All share `secret`, explicit `baseURL`, `trustedOrigins` (app origins + `https://*.<ROOT_DOMAIN>`), `rateLimit: { enabled: true, storage: "database", customRules: { "/sign-in/email": ... } }`, and `prismaAdapter(prisma, { provider: "postgresql" })` importing `prisma` from `@repo/db`. (See research D1/D3/D6/D7/D8, contracts/auth-endpoints.md.)
- [ ] T006 Generate Better Auth tables into the existing schema: run `pnpm dlx @better-auth/cli@latest generate --config apps/api/src/auth/instances.ts --output packages/db/prisma/schema.prisma`, review the diff, then `pnpm --filter @repo/db db:migrate` and `pnpm --filter @repo/db db:generate`. (Depends on T005.)
- [ ] T007 Configure mounting in `apps/api/src/main.ts`: create the app with `bodyParser: false`, re-enable JSON body parsing scoped to non-auth routes, and add `credentials: true` to `enableCors` (extend `buildCorsOrigins`). (Depends on T005.)
- [ ] T008 Mount the three handlers in `apps/api/src/auth/auth.mount.ts` via `toNodeHandler(instance)` for `/api/auth/admin/*`, `/api/auth/dashboard/*`, `/api/auth/customer/*` (Express 5 splat), reconciling Better Auth `basePath` with the Nest `api` global prefix so effective paths match the clients. (Depends on T005, T007.)
- [ ] T009 [P] Create the guard factory `apps/api/src/auth/auth-guard.factory.ts` → `createAuthGuard(instance)` producing `AdminAuthGuard`, `DashboardAuthGuard`, `CustomerAuthGuard` (the customer one optional/non-throwing), each calling `instance.api.getSession({ headers })` and attaching `{ session, user }` to the request. (Depends on T005.)
- [ ] T010 [P] Build a provider-agnostic `EmailSender` in `apps/api/src/auth/email/` selected by `EMAIL_TRANSPORT`: a `ConsoleEmailSender` (dev — logs recipient, link, and code) and an SMTP adapter (Nodemailer). Add a **combined** magic-link+OTP template helper that emits a single email containing both a link and a code (merge the two plugin callbacks). (See research D6.)
- [ ] T011 [P] Add new `ErrorCode`s to `@repo/schemas` (`INVITATION_NOT_FOUND`, `INVITATION_EXPIRED`, `INVITATION_ALREADY_USED`, `INVITATION_REVOKED`, `INVITATION_NOT_PENDING`, `NOT_A_MEMBER`, `INSUFFICIENT_ROLE`, `LAST_OWNER`; reuse `RESTAURANT_NOT_FOUND` if present) in the canonical `ErrorCode` enum. (See contracts/api-contracts.md.)
- [ ] T012 [P] Add Turkish messages for each new `ErrorCode` in `@repo/i18n` `getErrorMessage`. (Depends on T011.)
- [ ] T013 Verify `apps/api` builds and boots with all three instances mounted, `/api/auth/{admin,dashboard,customer}/get-session` reachable and returning `null` unauthenticated. (Depends on T006, T008, T009.)

**Checkpoint**: Auth infrastructure live; user-story phases can begin.

---

## Phase 3: User Story 1 — Secure platform admin access (P1) 🎯 MVP

**Goal**: The single admin signs in to the admin panel; everything admin is closed to everyone else; works local or remote; throttled but never permanently locked out.

**Independent test**: Provision the admin, sign in, reach restaurant management, sign out, confirm every admin route/action is rejected unauthenticated; exceed sign-in attempts → throttled → recovers after the window.

- [ ] T014 [US1] Implement the idempotent single-admin bootstrap in `apps/api/src/auth/seed-admin.ts` (reads `ADMIN_BOOTSTRAP_*`, creates the one `admin_user` via `adminAuth.api` if absent) and wire a `seed:admin` script in `apps/api/package.json`.
- [ ] T015 [US1] Apply `AdminAuthGuard` to all existing admin-facing API controllers/routes (restaurant management, activity, etc.) so they reject non-admin sessions; confirm none are left unguarded.
- [ ] T016 [P] [US1] Create the admin Better Auth client in `apps/admin/lib/auth-client.ts` (`createAuthClient({ baseURL: NEXT_PUBLIC_API_URL, basePath: "/api/auth/admin", fetchOptions: { credentials: "include" } })`).
- [ ] T017 [US1] Build the admin sign-in page + sign-out in `apps/admin` (react-hook-form + Zod locale per existing pattern), and route protection in the admin layout/middleware that redirects unauthenticated users to sign-in (optimistic `getSessionCookie({ cookiePrefix: "pa" })` + server validation).
- [ ] T018 [P] [US1] Unit test the bootstrap (idempotency) in `apps/api/src/auth/seed-admin.spec.ts`.
- [ ] T019 [US1] E2e test in `apps/api/test/admin-auth.e2e-spec.ts`: unauthenticated admin route → 401/redirect; sign-in success; sign-out revokes; rate-limit threshold → 429 then recovery after window; **sign-in with an unknown email returns a response indistinguishable from a wrong-password response (no account-existence leak, FR-026)** (SC-001, SC-007, FR-002/003/004/026).

**Checkpoint**: Admin panel is securely gated — a deployable MVP on its own.

---

## Phase 4: User Story 2 — Restaurant owner onboarding by invitation (P2)

**Goal**: Admin invites an owner by email → owner verifies (link or code), sets a password, signs in to a dashboard scoped to only their restaurant.

**Independent test**: From seeded admin + restaurant, send invite → accept via verification → set password → sign in to dashboard → see only that restaurant; reused/expired/revoked tokens rejected; cross-restaurant access denied.

- [ ] T020 [US2] Add `RestaurantRole` + `InvitationStatus` enums and `RestaurantMember` / `RestaurantInvitation` models (with relations on `Restaurant`, `@@map`, indexes, `cuid(2)`) to `packages/db/prisma/schema.prisma`; migrate (`db:migrate`) and regenerate (`db:generate`). (See data-model.md.)
- [ ] T021 [US2] Add `restaurantMember` and `restaurantInvitation` delegates to `apps/api/src/prisma/prisma.service.ts`. (Depends on T020.)
- [ ] T022 [P] [US2] Add invitation + membership Zod schemas/types to `@repo/schemas` (invite-owner body, accept body `{ password }`, invitation lookup response, membership shapes) per contracts/api-contracts.md.
- [ ] T023 [US2] Implement `apps/api/src/invitations/` service: create owner invitation (hash unguessable single-use token, set TTL, cancel prior pending for the pair), get-by-token (hash compare + lazy expiry), revoke, and accept (transactional: ensure/create `dash_user`, set first password via Better Auth server API, create `RestaurantMember`, mark `ACCEPTED`). (Depends on T020–T022, T010.)
- [ ] T024 [US2] Implement the invitations controller endpoints with `ZodValidationPipe`: `POST /api/admin/restaurants/:id/invitations` + `GET` list + `DELETE /api/admin/invitations/:id` (guard `AdminAuthGuard`); `GET /api/invitations/:token` + `POST /api/invitations/:token/accept` (public/token). Send the combined invite email. (Depends on T023; uses T009/T010.)
- [ ] T025 [US2] Implement `GET /api/me/restaurants` (membership list + role) guarded by `DashboardAuthGuard` in `apps/api/src/members/`. (Depends on T021.)
- [ ] T026 [US2] Enforce membership-scoped authorization: a reusable helper/guard that resolves `RestaurantMember` for `(restaurantId, session.userId)` and denies (`NOT_A_MEMBER`) at the data layer; apply to dashboard restaurant-scoped routes. (Depends on T021, T009.)
- [ ] T027 [P] [US2] Create the dashboard Better Auth client in `apps/dashboard/lib/auth-client.ts` (basePath `/api/auth/dashboard`, `credentials: include`).
- [ ] T028 [US2] Build the dashboard sign-in page + sign-out and route protection (optimistic `getSessionCookie({ cookiePrefix: "dash" })` in `apps/dashboard/proxy.ts` + server validation). (Depends on T027.)
- [ ] T029 [US2] Build the invitation-acceptance page in `apps/dashboard` (`features/invitations/`: `api.ts`/`queries.ts`/`use-*.ts` over `apiFetch`) — token lookup, set-password form, then sign-in. (Depends on T022, T027.)
- [ ] T030 [P] [US2] Build the admin invite-owner UI in `apps/admin/features/invitations/` (`api.ts`/`queries.ts`/`use-*.ts` over `apiFetch`, optimistic per existing convention) — invite, list, revoke. (Depends on T022, T016.)
- [ ] T031 [P] [US2] Unit test invitation service in `apps/api/src/invitations/invitations.service.spec.ts`: token single-use/hash, expiry, revoke, accept creates member + password.
- [ ] T032 [US2] E2e test `apps/api/test/invitations.e2e-spec.ts`: full invite→accept→sign-in; reused/expired/revoked token rejected (each `ErrorCode`); member of A requesting B → denied (SC-002, SC-003, SC-005, FR-005–011).

**Checkpoint**: End-to-end owner onboarding works; dashboard is membership-scoped.

---

## Phase 5: User Story 3 — Restaurant team members and roles (P3)

**Goal**: Owner invites staff with roles; permissions enforced per restaurant; last owner protected; multi-restaurant users isolated.

**Independent test**: Owner invites a `STAFF` member → accept → sign in → owner-only actions denied, permitted ones succeed; change/remove role takes effect; demote/remove sole owner blocked; same user in two restaurants with no leakage.

- [ ] T033 [P] [US3] Define the role→permission map in `@repo/schemas` (which actions each `RestaurantRole` may perform) and a typed permission-check helper. (See data-model.md.)
- [ ] T034 [US3] Extend `apps/api/src/members/` service with role enforcement (`hasPermission(role, action)` → `INSUFFICIENT_ROLE`), and the member-invite path reusing the invitations service with a chosen role + `invitedByUserId`. (Depends on T033, T023, T026.)
- [ ] T035 [US3] Implement member endpoints in the members controller: `POST /api/restaurants/:id/members/invitations` (owner-only), `GET /api/restaurants/:id/members`, `PATCH .../members/:userId` (role change), `DELETE .../members/:userId` — all `DashboardAuthGuard` + membership-scoped, with **last-owner protection** (`LAST_OWNER`) on demote/remove. (Depends on T034.)
- [ ] T036 [US3] Build the dashboard members UI in `apps/dashboard/features/members/` (`api.ts`/`queries.ts`/`use-*.ts` over `apiFetch`) — list, invite-with-role, change role, remove. (Depends on T033, T022.)
- [ ] T037 [US3] Add restaurant switching in `apps/dashboard` driven by `GET /api/me/restaurants` for multi-restaurant users (active-restaurant context, no cross-leak). (Depends on T025.)
- [ ] T038 [P] [US3] Unit test role enforcement + last-owner invariant in `apps/api/src/members/members.service.spec.ts`.
- [ ] T039 [US3] E2e test `apps/api/test/members.e2e-spec.ts`: role-gated actions, role change/remove effect, last-owner rejection, multi-restaurant isolation (FR-012–016).

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
