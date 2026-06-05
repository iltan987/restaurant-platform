# Implementation Plan: Restaurant Onboarding & Setup

**Branch**: `002-restaurant-onboarding-setup` | **Date**: 2026-06-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-restaurant-onboarding-setup/spec.md`

## Summary

Add the end-to-end onboarding lifecycle for a restaurant: the admin registers a restaurant (created **inactive**, with a default floor + area) and can also manage any restaurant through a **plain management view**; staff run a desktop-first, step-by-step dashboard setup that defines the layout as **floors → areas → tables**, arrange tables on an **editable visual floor-plan canvas**, produce a **stable per-table QR code** (downloadable/printable individually or in bulk), and explicitly **go live** (never automatic, requires ≥1 table, skippable only via a warned confirmation); and a customer who scans a table QR reaches the mobile-first **customer** app on the restaurant's subdomain, seeing a **placeholder menu** only when the restaurant is live and the table is valid, otherwise a friendly "not available" page. All lists are paginated defensively (pager hidden until a second page exists).

Technical approach: extend the existing schema-first contract (`@repo/schemas` + `ErrorCode` + `@repo/i18n`), add `Floor`, `Area`, and `Table` models (Table carrying `areaId` + optional canvas coordinates) plus onboarding/visibility state on `Restaurant` in `@repo/db`, expose REST endpoints from the NestJS `api` (restaurant/floor/area/table CRUD, go-live, batch canvas-layout save, all list endpoints paginated via a shared envelope), repurpose the `dashboard` `/s/[slug]` placeholder into the staff wizard/management/canvas UI, give the `admin` app a plain management surface over the same contract, and build the customer storefront fresh in the `customer` app. Both staff/customer apps are multi-tenant by `<slug>.<app-domain>`; customers never use the dashboard. QR images render client-side from the canonical customer URL; the visual canvas uses `@dnd-kit` (DOM-based, keyboard-accessible) so it meets WCAG 2.2 AA.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode, `NodeNext`, `noUncheckedIndexedAccess` (per repo `@repo/typescript-config`).

**Primary Dependencies**: NestJS 11 (`api`); Next.js 16 (`dashboard`, `customer`, `admin`); Prisma 7 + `@prisma/adapter-pg`; Zod 4 (`@repo/schemas`); TanStack Query (`@repo/query`); Base UI + shadcn `base-nova` + Tailwind v4 (`@repo/ui`); `@repo/api-client`, `@repo/core`, `@repo/i18n`. **New** (catalog-pinned, dashboard): `qrcode.react` (`4.2.0`, self-typed — replaces the stale, untyped `qrcode`) for client-side QR rendering, and `@dnd-kit` (`@dnd-kit/core@6.3.1` + `@dnd-kit/utilities@3.2.2`; free-xy via `useDraggable`, no `SortableContext`) for the accessible, DOM-based visual floor-plan canvas (see research §3/§9/§15). The dashboard also gains a `NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN` env var (QR codes target the customer storefront origin, not the dashboard). `customer` also gains `@repo/api-client`/`@repo/query`/`@repo/schemas`/`zod`.

**Storage**: PostgreSQL 18 via Prisma driver adapter; **only the `api` app touches the DB** through `PrismaService`.

**Testing**: Jest for `api` — colocated `*.spec.ts` unit tests (service logic) and `test/*.e2e-spec.ts` (endpoint contracts). Frontend apps have no test harness today; UI is validated via the quickstart guide (no new FE test infra introduced by this feature).

**Target Platform**: Web. `api` is a Node server (`/api` prefix, port 3000). `dashboard` (3001) is **desktop-first**, subdomain-scoped per restaurant. `customer` (3002) is **mobile-first**, public subdomain storefront. `admin` (3003) is the single-operator panel.

**Project Type**: Turborepo monorepo — multiple Next.js apps + one NestJS API consuming shared packages.

**Performance Goals**: Scanning a valid table QR opens the placeholder menu in < 3s on a typical phone (SC-010); admin registers a restaurant in < 1 min (SC-001); all QR codes downloadable/printable in a single action ≤ 2 interactions (SC-003).

**Constraints**: Dashboard meets WCAG 2.2 AA + minimums (≥44px targets, ≥16px base text, high contrast, no timeouts, plain Turkish labels — FR-035); subdomain tenant routing; schema-first contract for every boundary crossing; no authentication yet (tenant binding is by subdomain).

**Scale/Scope**: Small — dozens of restaurants, each up to ~150+ tables; create/edit/delete are infrequent (setup-once + rare edits).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Schema-First Contract (NON-NEGOTIABLE) | New/changed payloads (`Floor`/`Area`/`Table` CRUD, restaurant status/onboarding, bulk-add, floor-layout, paginated list envelope) defined in `@repo/schemas`; new failures (`TABLE_*`/`FLOOR_*`/`AREA_*`/`GO_LIVE_REQUIRES_TABLE`) get `ErrorCode`s + Turkish `@repo/i18n` mappings; requests validated by `ZodValidationPipe`; clients (incl. admin management) call via `apiFetch`. | ✅ PASS — designed in Phase 1 contracts. |
| II. Strict Layering & Dependency Direction | Only `api` touches DB (new `floor`/`area`/`table` delegates on `PrismaService`); admin/dashboard share the same contract (no admin-only endpoints); `@repo/schemas`→`@repo/core` only; no app imported by a package. `@repo/schemas` stays compiled (api consumer). | ✅ PASS |
| III. Type Safety & Boundary Validation | All new endpoints validate input with Zod at the boundary (incl. pagination query, layout coords); responses validated client-side against schemas; strict TS, no suppressions planned. | ✅ PASS |
| IV. Test Discipline for Contracts & Services | New service logic (slug/label/floor/area uniqueness, non-empty removal guards, go-live-requires-table, status/onboarding transitions, default floor+area on create, layout save) and endpoint contracts get `*.spec.ts` + e2e tests. | ✅ PASS — enumerated in tasks (Phase 2). |
| V. Localization & Convention Consistency | New user-facing strings via `@repo/i18n` (Turkish); catalog-pinned deps for `qrcode.react` + `@dnd-kit`; compose `@repo/ui` primitives (no forked UI); canvas uses accessible DOM-based `@dnd-kit` to hold the WCAG 2.2 AA bar; Prettier/ESLint enforced. | ✅ PASS |

**Result**: PASS. No deviations → Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-restaurant-onboarding-setup/
├── plan.md              # This file (/speckit-plan)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (REST contract)
│   └── api.md
├── checklists/
│   └── requirements.md  # from /speckit-specify + /speckit-clarify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/
├── db/
│   └── prisma/schema.prisma         # + Floor, Area, Table models; Restaurant.status default → INACTIVE; + OnboardingStatus
├── schemas/src/
│   ├── restaurant.ts                # + onboardingStatus; update/status/onboarding input schemas
│   ├── floor.ts                     # NEW — floor input/response schemas
│   ├── area.ts                      # NEW — area input/response schemas
│   ├── table.ts                     # NEW — table (+ areaId, position), bulk-add, update, floor-layout schemas
│   ├── pagination.ts                # NEW — paginationQuerySchema + paginated(itemSchema) envelope
│   ├── errors.ts                    # + TABLE_*, FLOOR_*, AREA_*, GO_LIVE_REQUIRES_TABLE
│   └── index.ts                     # export floor/area/table/pagination
├── i18n/src/error-messages.ts       # + Turkish for the new codes
└── core/                            # (slugify reused; no change expected)

apps/
├── api/src/
│   ├── prisma/prisma.service.ts     # + `floor`, `area`, `table` delegates
│   ├── restaurants/                 # + update/delete/status (go-live)/onboarding; create → default floor+area (tx)
│   ├── floors/                      # NEW module — list/create/update/delete + PUT layout (canvas batch save)
│   ├── areas/                       # NEW module — list/create/update/delete (non-empty guard)
│   └── tables/                      # NEW module — list/create/bulk/update/delete + by-slug lookup
│       └── *.controller.ts · *.service.ts · *.module.ts · *.service.spec.ts
├── admin/features/{restaurants,floors,areas,tables}/   # plain management over the SAME contract
│   ├── api.ts · queries.ts · use-*.ts
│   └── components/*                 # status badge, edit dialog, plain floor/area/table management, confirmations
├── dashboard/                       # STAFF app (desktop-first), subdomain-scoped
│   ├── proxy.ts                     # kept — subdomain → /s/[slug] staff routes
│   ├── app/s/[slug]/                # wizard when onboarding IN_PROGRESS, else management; canvas route
│   └── features/{restaurants,floors,areas,tables}/  # api/queries/use-* (CRUD, go-live, QR, layout)
│       └── components/*             # SetupWizard, FloorsAreasStep, TablesStep, TableManager, QrSheet,
│                                    #   FloorPlanCanvas (@dnd-kit, keyboard-accessible), Pager
└── customer/                        # PUBLIC storefront (mobile-first), subdomain
    ├── proxy.ts                     # NEW — copied pattern from dashboard
    ├── app/s/[slug]/page.tsx        # root landing ("scan your table's QR" / not-available)
    ├── app/s/[slug]/t/[tableId]/page.tsx  # placeholder menu when active+valid, else not-available
    ├── app/providers.tsx            # NEW — QueryProvider + ZodInit (tr)
    └── features/{restaurants,tables}/  # fetch-by-slug + validate table
```

**Structure Decision**: Keep the established Turborepo layout and per-feature `features/<name>/` convention (`api.ts` over `apiFetch`, `queries.ts` factories, `use-*.ts` mutation hooks, server-component prefetch + dehydrate). New `floors` and `areas` follow the same per-resource module/feature shape as `restaurants`/`tables`. Both `dashboard` (staff) and `customer` (customers) are multi-tenant via the same `proxy.ts` subdomain→`/s/[slug]` rewrite, rendering different surfaces; the `admin` app is a third client of the **same** REST contract (no admin-only endpoints) providing a plain management view — deliberately without the wizard or canvas. Repurposing (research §1): `dashboard`'s `/s/[slug]` "Hoş geldiniz" placeholder becomes the staff wizard/management/canvas UI; the `customer` storefront is built fresh. The visual canvas is DOM-based (`@dnd-kit`) rather than `<canvas>`-based so tables stay focusable elements and the surface remains WCAG 2.2 AA (research §9). Customers never use the dashboard app.

## Complexity Tracking

> No constitution violations — section intentionally empty.
