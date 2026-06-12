# Feature Specification: Authentication & Authorization

**Feature Branch**: `004-auth-authorization`

**Created**: 2026-06-12

**Status**: Draft

**Input**: User description: "Authentication - Authorization. Admin app user is just me. Should work locally, should be able to work with remote, S3, remote dashboard, remote customer app etc. Customer app - optional simple auth for end user. google oauth, phone (i guess we can't send sms?), email (no password for simplicity). Dashboard app - email & password should work i think. Admin creates restaurant, sets up things, invites the owner, owner accepts the invitation. If customer logs in, we will improve system that does per-user things soon."

## Overview

The platform has three distinct audiences with deliberately different identity needs:

- **Platform admin** (a single operator) runs the internal admin panel: creates restaurants, configures them, and invites the people who will run them.
- **Restaurant staff** (owner first, optionally invited members) run a restaurant's dashboard and must only ever see and act on the restaurant(s) they belong to.
- **Diners** (customers) browse a restaurant's menu with no obligation to sign in; signing in is optional today and exists to unlock per-person features later.

This feature establishes who each person is (authentication) and what each person is allowed to do (authorization) across all three apps, plus the invitation flow that connects the admin's actions to a real owner account.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure platform admin access (Priority: P1)

The platform admin signs in to the admin panel with a single, pre-provisioned account and manages restaurants. Anyone who is not signed in as the admin cannot reach any admin function. The same account works whether the admin panel and its backend/storage run locally or are deployed remotely.

**Why this priority**: The admin panel is where restaurants are created and owners are invited. Until the admin can sign in securely, no other onboarding can happen, and the panel must never be open to the public.

**Independent Test**: Provision the single admin account, sign in, confirm access to restaurant management, sign out, and confirm every admin route/action is rejected when not signed in. Verifiable on its own as a thin but real MVP.

**Acceptance Scenarios**:

1. **Given** the admin account exists and the admin is signed out, **When** the admin submits the correct email and password, **Then** they are signed in and can access restaurant management.
2. **Given** an unauthenticated visitor, **When** they request any admin page or action, **Then** they are denied and redirected to sign in.
3. **Given** a signed-in admin, **When** they sign out, **Then** their session ends and protected admin actions are rejected until they sign in again.
4. **Given** the admin panel is pointed at a remote backend and remote asset storage, **When** the admin signs in and performs an action, **Then** it behaves the same as against a local backend (no environment-specific auth behavior).
5. **Given** repeated failed sign-in attempts on the admin account, **When** a threshold is exceeded, **Then** further attempts are throttled to slow brute-force guessing.

---

### User Story 2 - Restaurant owner onboarding by invitation (Priority: P2)

The admin creates a restaurant and invites its owner by email. The owner receives an invitation, accepts it by verifying their email (via a link **or** a code), sets a password, and from then on signs in to the dashboard with email and password. Once signed in, the owner sees and manages only the restaurant they were invited to.

**Why this priority**: This is the keystone flow the product is built around — it turns an admin-created restaurant into an owner-operated one. It depends on US1 (the admin must exist to invite) but delivers the first end-to-end value for an external user.

**Independent Test**: From a seeded admin + restaurant, send an invitation to an email, accept it through the verification step, set a password, sign in to the dashboard, and confirm the owner sees only their restaurant. Each step is observable.

**Acceptance Scenarios**:

1. **Given** a restaurant with no owner, **When** the admin invites an owner by email, **Then** an invitation is created and the recipient is notified with a way to accept.
2. **Given** a valid, unexpired invitation, **When** the recipient verifies their email via the link or the emailed code, **Then** they are allowed to set a password and an owner account is created and attached to that restaurant.
3. **Given** the owner has completed acceptance, **When** they later sign in with their email and password, **Then** they reach their restaurant's dashboard.
4. **Given** a signed-in owner, **When** they attempt to view or modify a restaurant they do not belong to, **Then** the action is denied.
5. **Given** an invitation that has expired or already been accepted, **When** the recipient tries to use it again, **Then** acceptance is refused with a clear reason.
6. **Given** an invitation was sent to the wrong address or is no longer wanted, **When** the admin revokes it, **Then** the invitation can no longer be accepted.

---

### User Story 3 - Restaurant team members and roles (Priority: P3)

A restaurant owner invites additional people (e.g., a manager or staff) to help run the restaurant and assigns each a role. Members sign in to the dashboard and can do only what their role permits, always scoped to that restaurant.

**Why this priority**: Real restaurants are run by more than one person. It extends US2's single-owner model into a team, but the platform is usable without it, so it ranks below owner onboarding.

**Independent Test**: As an owner, invite a member with a limited role, accept the invitation, sign in as that member, and confirm allowed actions succeed while disallowed actions are blocked — all confined to the one restaurant.

**Acceptance Scenarios**:

1. **Given** a signed-in owner, **When** they invite a person by email and assign a role, **Then** that person can accept and gain access to the restaurant with that role.
2. **Given** a member with a limited role, **When** they attempt an action their role does not permit, **Then** the action is denied while their permitted actions succeed.
3. **Given** a signed-in owner, **When** they change a member's role or remove the member, **Then** the member's access reflects the change on their next action.
4. **Given** a person belongs to more than one restaurant, **When** they sign in, **Then** they can act only within whichever restaurant they are currently working in and cannot leak data across restaurants.
5. **Given** a restaurant, **When** roles are evaluated, **Then** there is always at least one person with full owner-level control (the last owner cannot be removed or demoted into lockout).

---

### User Story 4 - Optional customer sign-in (Priority: P4)

A diner browses a restaurant's menu without signing in. If they choose to, they can sign in with Google or with their email (no password — they receive a magic link and a one-time code and may use either). Signing in does not gate browsing; it simply establishes who they are for future per-person features.

**Why this priority**: Customer auth is explicitly optional today and a foundation for later personalization. It carries no current gating responsibility, so it is the lowest priority.

**Independent Test**: Browse a menu anonymously and confirm full access. Then sign in with Google, and separately with email via both the magic link and the code, and confirm a stable customer identity is established each time.

**Acceptance Scenarios**:

1. **Given** an anonymous diner, **When** they browse a restaurant's menu, **Then** they can do so fully without being asked to sign in.
2. **Given** a diner who chooses to sign in, **When** they authenticate with Google, **Then** a customer identity is created or matched and they are signed in.
3. **Given** a diner who chooses email sign-in, **When** they request access, **Then** they receive an email containing both a magic link and a one-time code, and using either one signs them in.
4. **Given** a diner who signs in with Google and later with email using the same address, **When** the second sign-in completes, **Then** it resolves to the same single customer identity rather than creating a duplicate.
5. **Given** an expired or already-used magic link or code, **When** the diner tries to use it, **Then** sign-in is refused and they can request a fresh one.

---

### Edge Cases

- **Invitation to an existing person**: someone invited to a second restaurant (as owner or member) while already having an account — acceptance must attach the new membership to their existing identity, not create a duplicate account.
- **Email reuse across audiences**: the same email used as a dashboard member and as a customer — these are separate identity contexts and one does not grant access to the other.
- **Invitation lifecycle races**: an invitation that is revoked after the email is sent but before acceptance; an invitation accepted in one tab while opened in another.
- **Session expiry mid-task**: a session that expires while the user is working — protected actions must fail cleanly and prompt re-authentication without silently losing the user's place where avoidable.
- **Concurrent sessions / sign-out everywhere**: the same account signed in on multiple devices, and the effect of signing out.
- **Last-owner protection**: removing or demoting the only owner of a restaurant must be prevented.
- **Cross-restaurant access attempt**: a member of restaurant A directly requesting restaurant B's data must be denied, not merely hidden in the UI.
- **Wrong-app sign-in attempt**: an admin credential used against the dashboard, or a customer identity used against the admin/dashboard, must be rejected.
- **Throttling legitimate users**: brute-force protection on the admin account must not permanently lock out the sole admin (recoverable lockout).

## Requirements *(mandatory)*

### Functional Requirements

#### Platform admin

- **FR-001**: The system MUST provide exactly one pre-provisioned platform-admin account, authenticated by email and password. There is no admin self-signup and no admin-to-admin invitation in this feature.
- **FR-002**: The system MUST reject every admin panel page and action for anyone who is not the authenticated admin.
- **FR-003**: The admin's authentication MUST behave identically regardless of whether the admin panel, its backend, and its asset storage are local or remote (no environment-specific identity rules).
- **FR-004**: The system MUST throttle repeated failed admin sign-in attempts to resist brute-force guessing, while keeping lockout recoverable so the sole admin cannot be permanently locked out.

#### Restaurant owner onboarding & invitations

- **FR-005**: The admin MUST be able to invite an owner to a restaurant by email address.
- **FR-006**: An invitation MUST identify the target restaurant and intended role, MUST expire after a bounded time, and MUST be single-use.
- **FR-007**: The admin MUST be able to revoke a pending invitation, after which it can no longer be accepted.
- **FR-008**: Accepting an invitation MUST require the recipient to verify control of the invited email address, satisfiable by either a verification link or an emailed one-time code.
- **FR-009**: On acceptance, the system MUST create (or, if the email already has an account, reuse) the person's account, set their dashboard password if they do not have one, and attach the invited membership and role to the target restaurant.
- **FR-010**: After acceptance, the owner MUST be able to sign in to the dashboard with email and password.

#### Dashboard authorization, membership & roles

- **FR-011**: A dashboard user MUST be able to access and act on only the restaurant(s) they are a member of; requests for any other restaurant MUST be denied at the data/authorization layer, not only hidden in the UI.
- **FR-012**: A restaurant owner MUST be able to invite additional members by email and assign each an authorization role.
- **FR-013**: The system MUST enforce role-based permissions for restaurant actions, denying actions a member's role does not permit.
- **FR-014**: An owner MUST be able to change a member's role and remove a member, with the change taking effect on the member's subsequent actions.
- **FR-015**: The system MUST guarantee every restaurant always retains at least one owner-level member (the last owner cannot be removed or demoted into lockout).
- **FR-016**: The system MUST support a single person belonging to multiple restaurants without any cross-restaurant data leakage.

#### Customer (diner) sign-in

- **FR-017**: The system MUST allow diners to browse a restaurant's menu fully without signing in.
- **FR-018**: The system MUST offer optional customer sign-in via Google and via passwordless email.
- **FR-019**: Passwordless email sign-in MUST deliver both a magic link and a one-time code in the same email, either of which completes sign-in.
- **FR-020**: The system MUST resolve sign-ins that share the same verified email to a single customer identity rather than creating duplicates.
- **FR-021**: Customer identities MUST be a separate context from dashboard/admin identities; holding a customer identity MUST NOT grant any dashboard or admin access.

#### Sessions & cross-cutting security

- **FR-022**: Each app MUST maintain authenticated sessions independently; a session for one app/audience MUST NOT authorize another (admin ≠ dashboard ≠ customer).
- **FR-023**: Users MUST be able to sign out, ending the current session and revoking access to protected actions until they sign in again.
- **FR-024**: Sessions MUST expire after a bounded period of inactivity/age, after which protected actions require re-authentication.
- **FR-025**: Verification artifacts (invitation tokens, magic links, one-time codes) MUST be time-limited, single-use, and unguessable, and MUST be invalidated once used or expired.
- **FR-026**: The system MUST surface authentication and authorization failures with stable, localizable reasons consistent with the platform's existing error contract (no leaking of whether an account exists during sign-in/verification beyond what is necessary).
- **FR-027**: The system's identity model MUST be able to accommodate an additional phone-based sign-in method later without restructuring existing accounts (phone is out of scope now; see Assumptions).

### Key Entities *(include if feature involves data)*

- **Account**: A person's identity within an audience context (admin, dashboard staff, or customer). Holds verified email and, where applicable, a password credential. May link one or more sign-in methods.
- **Sign-in method / identity link**: A way an account authenticates — password, Google, passwordless email, (future) phone. Multiple methods can resolve to one account by verified email.
- **Session**: An authenticated period for one account in one app, with an expiry, that can be ended by sign-out.
- **Invitation**: An admin- or owner-issued, email-targeted, role-bearing, expiring, single-use grant to join a specific restaurant; has states (pending, accepted, revoked, expired).
- **Restaurant membership**: The link between an account and a restaurant, carrying a role; the basis for all dashboard authorization.
- **Role / permission set**: A named bundle of allowed actions within a restaurant (owner and at least one lesser member role), evaluated to permit or deny actions.
- **Verification artifact**: A time-limited, single-use, unguessable token/link/code used for invitation acceptance and passwordless email sign-in.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of admin panel pages and actions are inaccessible to unauthenticated visitors (zero unprotected admin endpoints).
- **SC-002**: A newly invited owner can go from receiving the invitation to signing in to their dashboard in under 3 minutes, without any manual support step.
- **SC-003**: In authorization testing, 100% of cross-restaurant access attempts (a member requesting another restaurant's data directly) are denied.
- **SC-004**: A diner can view a complete menu with zero authentication steps, and optional sign-in (Google or email) completes in under 1 minute.
- **SC-005**: Every invitation token, magic link, and one-time code becomes unusable immediately after first use or after its expiry, with no successful reuse in testing.
- **SC-006**: No session issued for one audience (admin/dashboard/customer) ever authorizes an action in another audience.
- **SC-007**: Brute-force protection throttles the admin account after a defined number of failures, and a legitimate admin can always regain access (no permanent lockout) in testing.

## Assumptions

- **Phone sign-in is out of scope for this feature.** No reliable zero-cost phone-verification channel exists today (SMS is paid; WhatsApp Business authentication-category messages are billed per message with no free tier), and the user does not want to incur cost. The identity model is designed so a phone method can be added later without restructuring existing accounts (FR-027).
- **Dashboard owners and members authenticate with email + password**, established at invitation acceptance (acceptance itself uses email verification via link or code).
- **Customer sign-in is optional and non-gating** today; it exists to enable per-person features in a later feature, which are out of scope here.
- **"Works locally and remote, S3, remote dashboard/customer"** means the auth design assumes no single-host coupling: the admin (and other apps) authenticate against the API and operate on assets/storage regardless of where those run, including across origins/subdomains. Choosing/configuring the storage backend (e.g., S3) itself is a deployment concern, not part of this feature's identity rules.
- **Identity contexts are separate per audience**: the same email may exist as both a dashboard member and a customer; these do not share access. (Whether they share one underlying account store is an implementation decision deferred to planning.)
- **A restaurant's roles** for v1 are owner plus at least one lesser member role; the exact catalog of member roles/permissions can be refined in planning.
- **Email delivery is available** (a transactional email channel) for invitations and passwordless codes/links; its provider/configuration is a deployment concern.
- **Localized, stable error reporting** reuses the platform's existing `ErrorCode`/`ApiError` contract and `@repo/i18n` Turkish messages rather than introducing a parallel scheme.

## Out of Scope

- Phone / SMS / WhatsApp sign-in (deferred — see Assumptions).
- Per-customer personalization features (order history, favorites, profiles) that customer sign-in is meant to unlock later.
- Multiple platform-admin accounts and admin-to-admin invitations.
- Self-service restaurant signup (restaurants are created by the admin).
- Dashboard password-reset/recovery polish beyond what acceptance establishes (can be a follow-up; basic recovery may be considered in planning).
- Choosing and provisioning the storage backend (S3 vs. local) and other deployment/hosting concerns.
