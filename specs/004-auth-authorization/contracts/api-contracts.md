# Contract: Custom membership/invitation API (schema-first)

These are **our** endpoints — fully on the platform contract: Zod schemas + types in `@repo/schemas`, validated server-side with `ZodValidationPipe`, errors as `{ statusCode, code, message }` with stable `ErrorCode`s, consumed on the frontend via `apiFetch(url, schema)`, localized via `@repo/i18n`. All live under the API `/api` prefix and are protected by the appropriate audience guard.

Conventions: request/response bodies are sketched as shapes; exact Zod schemas authored in `@repo/schemas` during implementation. `restaurantId` is always re-derived from the caller's membership/role, never trusted from the client alone.

---

## Admin surface (guard: `AdminAuthGuard`)

### `POST /api/admin/restaurants/:restaurantId/invitations`
Admin invites an **owner** to a restaurant (FR-005).
- Body: `{ email }` (role fixed to `OWNER`).
- Effect: creates a `PENDING` `RestaurantInvitation` (`invitedByAdmin: true`), cancels any prior pending invite for the pair, emails the recipient an acceptance link **and** code.
- Response: `{ invitation: { id, email, status, expiresAt } }`.
- Errors: `RESTAURANT_NOT_FOUND`, `OWNER_ALREADY_PRESENT?` (policy), validation.

### `GET /api/admin/restaurants/:restaurantId/invitations`
List a restaurant's invitations (status filter). → `{ invitations: [...] }`.

### `DELETE /api/admin/invitations/:invitationId`
Revoke a pending invitation (FR-007). `PENDING → REVOKED`. Errors: `INVITATION_NOT_FOUND`, `INVITATION_NOT_PENDING`.

> Restaurant **creation/setup** is the existing onboarding feature (002/003); this feature only adds the owner-invitation surface and authorization on top.

---

## Invitation acceptance (public / token-authenticated)

### `GET /api/invitations/:token`
Look up an invitation by raw token (hashed compare) for the acceptance screen.
- Response: `{ restaurantName, email, role, status }` or error.
- Errors: `INVITATION_NOT_FOUND`, `INVITATION_EXPIRED`, `INVITATION_ALREADY_USED`, `INVITATION_REVOKED`.

### `POST /api/invitations/:token/accept`
Accept and onboard (FR-008, FR-009, FR-010).
- Body: `{ password }` (set only if the dashboard account has none; verification of email is implied by token possession + Better Auth verification).
- Effect (transactional): ensure/create the `dash_user` for `email`; set first password via Better Auth server API if absent; create `RestaurantMember(restaurantId, userId, role)`; mark invitation `ACCEPTED`.
- Response: `{ ok: true }` (client then signs in via dashboard auth).
- Errors: terminal-state errors above, `WEAK_PASSWORD` (delegated to Better Auth policy), validation.

---

## Dashboard surface (guard: `DashboardAuthGuard`, scoped by membership)

Every endpoint resolves the caller's `RestaurantMember` for the target restaurant and denies if absent or role-insufficient (FR-011, FR-013, FR-016).

### `GET /api/me/restaurants`
Restaurants the signed-in user belongs to (+ their role). Drives restaurant switching. → `{ memberships: [{ restaurantId, name, slug, role }] }`.

### `POST /api/restaurants/:restaurantId/members/invitations`
Owner invites a member with a role (FR-012). Requires caller role = `OWNER`.
- Body: `{ email, role }` (role ∈ non-owner-or-owner per policy). → creates `PENDING` invitation (`invitedByUserId`), emails link+code.
- Errors: `NOT_A_MEMBER`, `INSUFFICIENT_ROLE`, validation.

### `GET /api/restaurants/:restaurantId/members`
List members + roles (caller must be a member). → `{ members: [{ userId, email, role }] }`.

### `PATCH /api/restaurants/:restaurantId/members/:userId`
Change a member's role (FR-014). Requires `OWNER`. Body `{ role }`.
- Guard: **last-owner protection** — demoting the only `OWNER` is rejected (FR-015) → `LAST_OWNER`.
- Errors: `NOT_A_MEMBER`, `INSUFFICIENT_ROLE`, `LAST_OWNER`.

### `DELETE /api/restaurants/:restaurantId/members/:userId`
Remove a member (FR-014). Requires `OWNER`. Removing the last `OWNER` rejected (`LAST_OWNER`).

---

## Customer surface

No custom authz endpoints in this feature — customer sign-in is non-gating and per-user features are out of scope. Menu browsing stays public (FR-017). A `CustomerAuthGuard` exists (optional) for later per-user features.

---

## New `ErrorCode`s (added to `@repo/schemas`, Turkish in `@repo/i18n`)
`RESTAURANT_NOT_FOUND` (reuse if present), `INVITATION_NOT_FOUND`, `INVITATION_EXPIRED`, `INVITATION_ALREADY_USED`, `INVITATION_REVOKED`, `INVITATION_NOT_PENDING`, `NOT_A_MEMBER`, `INSUFFICIENT_ROLE`, `LAST_OWNER`. (Auth/credential/throttle errors surface from Better Auth's own responses.)

## Contract test expectations
- Each endpoint: happy path + each listed `ErrorCode` returns the documented `{ statusCode, code }`.
- Authorization: cross-restaurant access (member of A requesting B) → denied (SC-003).
- Invitation lifecycle: expired/used/revoked token rejected on `GET` and `accept` (SC-005).
- Last-owner: demote/remove sole owner → `LAST_OWNER` (FR-015).
