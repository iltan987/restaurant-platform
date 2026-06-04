# Long-Term Plan — QR Menu Platform (Turkey)

## Context

**Product vision.** A multi-tenant QR-menu platform for restaurants in Turkey. A customer scans a QR code on their table, lands on the restaurant's menu, browses item detail, and can either (a) place an order themselves and pay online, or (b) order through a waiter and pay the cashier. Multiple people can join the same table session; staff see which tables are occupied in real time; customers can split and pay their share as they wish.

**Why now / current state.** The repo is a well-architected *foundation-only* scaffold. What exists:
- **Data model**: only the `Restaurant` model (`packages/db/prisma/schema.prisma`) — `id, name, slug, status`.
- **API** (`apps/api/src`): Restaurant CRUD only — `RestaurantsModule` (`POST/GET /restaurants`, `GET /restaurants/:slug`), a global `HttpExceptionFilter`, `ZodValidationPipe`, `PrismaService`. No auth, menu, table, session, order, or payment modules.
- **Admin app** (`apps/admin`): feature-complete restaurant management (create form, list, optimistic updates, Turkish errors) — a strong reference implementation of the project's conventions.
- **Dashboard app** (`apps/dashboard`): mature subdomain multi-tenant routing (`proxy.ts`, `/s/[slug]`) but no tenant-facing features yet.
- **Customer app** (`apps/customer`): empty placeholder.
- **Shared packages**: `@repo/ui` (solid shadcn/Base UI set), `@repo/query`, `@repo/api-client` (`apiFetch` + `ApiError`), `@repo/i18n` (Turkish error map), `@repo/core` (`slugify`), `@repo/schemas` (the client↔server contract). No auth anywhere.
- **SpecKit** is scaffolded but the constitution is still the uncustomized template.

So almost the entire product domain is greenfield. The patterns to follow are already proven (schemas-as-contract, feature folders with `api.ts`/`queries.ts`/`use-*.ts`, structured `ErrorCode`s, optimistic mutations). The job of this plan is to lay out the long-term arc, not to write code.

**Key product decisions (confirmed with stakeholder):**
1. **Customer identity** — *Optional accounts*. Guest-by-default: a device joins a table with a lightweight session token, no login needed to browse/order/pay. Optional Better Auth sign-in (phone/social) unlocks order history, favorites, loyalty later.
2. **Payments** — *Abstract gateway, iyzico first*. Provider-agnostic `PaymentProvider` port; implement **iyzico** first (cards, 3D Secure, installments — dominant in TR); leave room for PayTR/Stripe adapters.
3. **Real-time** — *WebSockets* via a NestJS gateway (Socket.IO). Rooms per table-session for live occupancy, live order status, and multi-device session sync.
4. **Phasing** — *Menu-first*, but with **tables + per-table QR + session-on-scan as Phase-1 foundation** (the QR is inherently per-table, and the customer flow is "join table → view menu"). Heavier live-session/staff features come in Phase 2.

---

## Target Architecture

### Domain model (the spine — built incrementally across phases)

All new models hang off `Restaurant` (tenant scope) and follow the existing CUID + `@@map` conventions in `packages/db/prisma/schema.prisma`.

- **Restaurant** *(exists)* — add relations to everything below; add settings (currency `TRY`, locale, service-charge %, tax config, ordering mode flags).
- **Menu / Category / MenuItem** — menu → categories → items. Items carry name, description, price, image, availability, ordering. **Modifiers / option groups** (e.g. size, extras) and **allergen/dietary tags**.
- **Table** — belongs to a restaurant, has a label/number and a stable QR token (the QR encodes `restaurantSlug` + `tableToken`). QR is regenerable.
- **TableSession** — an open "tab" at a table. Has status (`OPEN`/`CLOSED`), opened/closed timestamps, and many **SessionParticipant**s (one per joined device/customer, optionally linked to a `User`). This is what "multiple people join the same table" means concretely.
- **Order / OrderItem** — an order belongs to a `TableSession` (and records which participant placed it). Status lifecycle (`PENDING → CONFIRMED → PREPARING → READY → SERVED`, plus `CANCELLED`). Order items snapshot price + chosen modifiers at order time.
- **Payment / PaymentAllocation** — payments settle against a session. Supports the split flows: pay-whole, split-evenly-by-N, pay-for-specific-items, pay-my-own-orders. `PaymentAllocation` links a payment to the items/share it covers so the session knows the remaining balance. Method = online (iyzico) or `COUNTER` (cash/card at cashier, marked paid by staff).
- **User / Staff / Role** — restaurant staff (roles: owner, manager, waiter, kitchen) and optional customer accounts. Managed via **Better Auth** with the **organization plugin** for restaurant-scoped staff roles/permissions; platform admins manage restaurants.

### Backend (NestJS, `apps/api`)

One feature module per domain area, mirroring `RestaurantsModule`: `MenusModule`, `TablesModule`, `SessionsModule`, `OrdersModule`, `PaymentsModule`, `AuthModule`. Each: controller with `ZodValidationPipe` + shared schema, service throwing structured `ErrorCode`s, delegate added to `PrismaService`.
- **Auth/authorization**: Better Auth on the server; a Nest guard mapping Better Auth sessions → staff role checks. Customer session tokens are a separate lightweight mechanism (signed token tied to a `SessionParticipant`), not full accounts.
- **Real-time**: a `RealtimeGateway` (Socket.IO) with rooms keyed by `restaurant:<id>` (staff dashboard) and `session:<id>` (table participants). Services emit events (order created, status changed, participant joined, payment settled) after DB writes.
- **Payments**: `PaymentProvider` interface + `IyzicoProvider` adapter; webhook/callback controller to confirm 3D-Secure results; idempotent settlement against `Payment`/`PaymentAllocation`.

### Shared packages

- **`@repo/schemas`** — grow the contract: menu/table/session/order/payment input + response schemas, and a much larger `ErrorCode` enum (e.g. `SESSION_CLOSED`, `ITEM_UNAVAILABLE`, `PAYMENT_FAILED`, `ALREADY_PAID`, `TABLE_NOT_FOUND`). Single source of truth for both client and server.
- **`@repo/i18n`** — Turkish messages for every new `ErrorCode`; introduce a `locale` argument and an EN map (foundation for bilingual menus/UI).
- **`@repo/core`** — pure helpers that will be needed widely: **currency (TRY) formatting/`money` math**, **id/QR-token generation**, time/business-hours helpers. (Per CLAUDE.md, pure helpers live here, not in `@repo/schemas`.)
- **`@repo/ui`** — extend with menu/cart/order/payment components as features land (not upfront).
- **New `@repo/realtime` (likely)** — a thin typed Socket.IO client wrapper + React hook for the Next apps, mirroring how `@repo/api-client` wraps fetch. Decide when Phase 2 starts.

### Frontend apps

- **`customer`** (build out from empty): QR landing → join table session → browse menu (category nav, item detail, modifiers) → cart → place order → live order status → split & pay (iyzico). Guest-first; optional sign-in. This is where most net-new UI lives.
- **`dashboard`** (tenant staff): menu editor (CRUD categories/items/modifiers, availability toggles), table management + QR download, **live floor view** (which tables occupied, who's seated, open tabs), order queue / kitchen view, payment reconciliation. Real-time driven.
- **`admin`** (platform): already does restaurant onboarding; extend with plan/billing, staff invitations, and platform-level oversight as needed.

---

## Phased Roadmap

> Phases ship value independently. Each phase = SpecKit feature(s): `speckit-specify` → `speckit-plan` → `speckit-tasks` → `speckit-implement`. Before Phase 1, run `speckit-constitution` to replace the placeholder constitution with this project's principles (schemas-as-contract, tenant isolation, TDD for services, structured errors, Turkish-first i18n).

### Phase 1 — Digital menu over QR *(foundation + first value)*
- **Data**: `Menu`, `Category`, `MenuItem` (+ modifiers minimal), `Table` (+ QR token). Lightweight `TableSession` created on scan (no heavy lifecycle yet).
- **API**: `MenusModule` (read + tenant CRUD), `TablesModule` (CRUD + QR token), public menu-by-slug endpoint, scan→session-token endpoint.
- **Dashboard**: menu editor + table management + QR download.
- **Customer**: scan QR → land on restaurant menu → category browse + item detail. Read-only (no ordering yet).
- **Cross-cutting**: currency/`money` helper in `@repo/core`; new schemas + Turkish error messages.
- **Outcome**: a restaurant can publish a menu and print table QRs that customers can scan and browse. Genuinely usable.

### Phase 2 — Tables, sessions & staff floor view *(the multi-person core)*
- **Data**: full `TableSession` lifecycle + `SessionParticipant`.
- **API**: `SessionsModule` (open/join/close, participant management); **`RealtimeGateway`** introduced here.
- **Auth**: Better Auth staff accounts + organization roles; protected dashboard.
- **Dashboard**: **live floor view** — occupied tables, participants per table, open tabs, updating in real time.
- **Customer**: join an existing table session (multiple devices, same tab); see who's at the table.
- **Outcome**: staff have a real-time picture of the floor; multiple customers share one table session.

### Phase 3 — Ordering *(self-order + waiter)*
- **Data**: `Order`, `OrderItem` with status lifecycle.
- **API**: `OrdersModule`; emit order/status events over the gateway.
- **Customer**: cart → place order against the session → live order status updates.
- **Dashboard**: order queue / kitchen view; staff place waiter orders on behalf of a table; advance statuses.
- **Outcome**: the full order loop works — self-order *and* waiter-order both land in the same session.

### Phase 4 — Payments & bill splitting
- **Data**: `Payment`, `PaymentAllocation`.
- **API**: `PaymentsModule` with `PaymentProvider` port + **iyzico adapter**, 3D-Secure callback/webhook, idempotent settlement; `COUNTER` payment path for cashier/cash.
- **Customer**: pay whole / split evenly / pay specific items / pay my own — with live remaining-balance; receipt via SMS/email (optional, ties to optional account).
- **Dashboard**: mark counter payments paid; reconciliation; close settled sessions.
- **Outcome**: the headline experience — scan, order, split, pay — is complete end to end.

### Phase 5 — Polish, scale & growth
Optional-account features (order history, favorites, **loyalty**), bilingual (TR/EN) menus & UI, item images/CDN, analytics for owners, additional payment providers (PayTR/Stripe), performance/observability hardening, and (if desired later) takeaway/delivery building on the same order model.

---

## Cross-Cutting Concerns (apply every phase)

- **Tenant isolation**: every query scoped by restaurant; never leak across tenants. Bake into services + tests from day one.
- **Contract discipline** (per CLAUDE.md): new endpoint ⇒ schema in `@repo/schemas` → `ErrorCode` if a distinct UI message is needed → structured throw in service → Turkish mapping in `@repo/i18n`.
- **Testing**: Jest unit specs colocated for every service (esp. money math, split logic, session/order state transitions — these are correctness-critical); e2e for the order→pay loop.
- **Money correctness**: integer-minor-units (kuruş) everywhere; centralize in `@repo/core`. Never float math on prices.
- **Idempotency & concurrency**: payments and order placement must be idempotent and race-safe (reuse the P2002 pattern already in `RestaurantsService`).
- **Security**: customer session tokens signed + scoped to a session; staff actions behind role guards; payment callbacks signature-verified.

---

## Critical Files / Anchors

- `packages/db/prisma/schema.prisma` — extend with all new models (currently `Restaurant`-only).
- `apps/api/src/restaurants/` — the **template** for every new Nest module (controller + service + module + schema validation + structured errors).
- `apps/api/src/prisma/prisma.service.ts` — add a delegate per new model.
- `apps/api/src/common/` (`HttpExceptionFilter`, `ZodValidationPipe`) — reuse as-is.
- `packages/schemas/src/{errors.ts,restaurant.ts,index.ts}` — pattern for new schemas + `ErrorCode`s.
- `packages/i18n/src/error-messages.ts` — add Turkish messages.
- `packages/core/src/` — add currency/QR/time helpers alongside `slug.ts`.
- `apps/admin/features/restaurants/` — **reference** for the feature-folder convention (`api.ts`, `queries.ts`, `use-*.ts`, optimistic mutations) to replicate in dashboard/customer.
- `apps/dashboard/proxy.ts` + `app/s/[slug]/` — existing multi-tenant entry to extend.
- Better Auth: use the `better-auth-best-practices` + `organization-best-practices` skills when Phase 2 auth begins.

---

## Verification (per phase, end-to-end)

This is a strategy plan, so verification is defined per phase rather than now. The general loop:
1. `pnpm --filter @repo/db db:generate && db:migrate` after schema changes; `pnpm typecheck` / `pnpm lint` clean across the monorepo.
2. **Unit**: `pnpm --filter api test` — services for the phase, with emphasis on money/split/state-machine logic.
3. **e2e**: `pnpm --filter api test:e2e` for the cross-module flows (notably order→pay in Phase 3–4).
4. **Manual**: `pnpm dev`; exercise the real flow on the dev ports — admin `:3003` creates a restaurant, dashboard `<slug>.localhost:3001` manages menu/tables, customer `:3002` scans/browses/orders/pays. Confirm real-time events fire (open two browsers on one table session).
5. From Phase 4: iyzico **sandbox** test cards for 3D-Secure success/failure and the split-payment balance math.

---

## Immediate Next Steps (when execution begins — not now)

1. `speckit-constitution` — encode project principles (this plan's cross-cutting concerns).
2. `speckit-specify` Phase 1 (digital menu + tables + QR).
3. `speckit-plan` → `speckit-tasks` for Phase 1; begin with the Prisma model extension + `MenusModule`.
