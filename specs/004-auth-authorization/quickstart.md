# Quickstart & Validation: Authentication & Authorization

A runnable guide to prove the feature end-to-end. Implementation details live in `tasks.md`; this is the validation/run guide. See `data-model.md` and `contracts/` for shapes.

## Prerequisites
- `docker compose up -d` (Postgres 18 on :5432).
- Env per app (extend each `.env.example`):
  - **api**: `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL` (e.g. `http://localhost:3000`), `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, transactional email creds, existing `DATABASE_URL`/`ADMIN_URL`/`DASHBOARD_URL`/`CUSTOMER_URL`.
  - **admin/dashboard/customer**: existing `NEXT_PUBLIC_API_URL` (auth client `baseURL`).
- Google OAuth credentials with the customer callback (`/api/auth/customer/callback/google`) registered.

## Setup
```bash
pnpm install
# generate Better Auth tables into the existing Prisma schema, then migrate
pnpm dlx auth@latest generate --config apps/api/src/auth/instances.ts --output packages/db/prisma/schema.prisma
pnpm --filter @repo/db db:migrate
pnpm --filter @repo/db db:generate
# seed the single platform admin (idempotent)
pnpm --filter api seed:admin
pnpm dev
```

## Validation scenarios (map to spec acceptance criteria)

### US1 — Secure admin access (P1)
1. Visit admin (`:3003`) unauthenticated → redirected to sign-in; hit any admin API route → `401` (SC-001).
2. Sign in with bootstrap creds → reach restaurant management.
3. Sign out → protected routes rejected again.
4. Hammer `/api/auth/admin/sign-in/email` with wrong password (rate limit `enabled:true`) → `429` after the threshold; wait the window → sign-in works again (no permanent lockout, SC-007).
5. Point the admin app at a remote `NEXT_PUBLIC_API_URL` → identical behavior (FR-003).

### US2 — Owner onboarding by invitation (P2)
1. As admin, `POST /api/admin/restaurants/:id/invitations` `{ email }` → recipient gets an email with **both** a link and a code.
2. `GET /api/invitations/:token` → shows restaurant + email + role.
3. `POST /api/invitations/:token/accept` `{ password }` → `dash_user` created, member row `OWNER`, invitation `ACCEPTED`.
4. Sign in to dashboard (`:3001`) with that email+password → land on the owner's restaurant; signing in completes < 3 min from invite (SC-002).
5. Reuse the same token → rejected (`INVITATION_ALREADY_USED`, SC-005). Revoke a different pending invite → its token rejected (`INVITATION_REVOKED`).
6. As that owner, request a **different** restaurant's data directly → denied (SC-003).

### US3 — Members & roles (P3)
1. As owner, invite a member with role `STAFF`; accept; sign in.
2. Member attempts an owner-only action (e.g. invite another member) → denied (`INSUFFICIENT_ROLE`); permitted actions succeed (FR-013).
3. Owner changes the member's role / removes them → effect on next action (FR-014).
4. Demote/remove the **sole** owner → `LAST_OWNER` (FR-015).
5. Add the same user to a second restaurant → both memberships work, no cross-leak (FR-016).

### US4 — Optional customer sign-in (P4)
1. Browse a menu on customer (`:3002`) anonymously → fully works, no prompt (SC-004).
2. Sign in with Google → `cust_user` created/matched.
3. Email sign-in → one email with link **and** code; use the **link** once (success), then in a fresh attempt use the **code** (success); reuse an old link/code → rejected (SC-005).
4. Sign in with Google then email on the same verified address → single `cust_user` (no duplicate, FR-020).

### Cross-cutting
- A valid admin session cookie presented to dashboard/customer get-session → not authorized there; and vice-versa (SC-006, separate cookiePrefix/tables).

## Automated checks
- `pnpm --filter api test` — service/unit (membership/invitation logic, last-owner, role checks).
- `pnpm --filter api test:e2e` — contract tests per `contracts/api-contracts.md` (happy + each `ErrorCode`, cross-restaurant denial, invitation lifecycle).
- `pnpm lint && pnpm typecheck` — must pass.
