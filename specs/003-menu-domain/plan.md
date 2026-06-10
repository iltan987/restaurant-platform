# Implementation Plan: Menu Domain

**Branch**: `003-menu-domain` | **Date**: 2026-06-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-menu-domain/spec.md`

## Summary

Build the **menu** that the rest of the Adisyon system stands on: per-restaurant **categories** and
**menu items** (prices in kuruş), with optional **media** (photos/videos via direct-to-S3 presigned
upload), **allergens** (a per-restaurant set seeded with the standard EU-14 on restaurant creation,
extendable with custom entries), reusable **tags**, a unified **option-group** mechanism that
expresses size variants, paid extras, and add/remove ingredients (one `defaultSelected` flag), and
per-item **availability windows** (multi-day, time-ranged, midnight-crossing, evaluated in
Europe/Istanbul). Staff author all of this in the **dashboard**; the **customer app** consumes a
public `MenuTree` (active restaurants only) and searches it **client-side in-memory**.

Technical approach: extend the established schema-first contract (`@repo/schemas` + `ErrorCode` +
`@repo/i18n`), add 8 Prisma models + 3 enums + two implicit m2m relations to `@repo/db`, centralize
pure logic (effective price, unit price, orderable-now, standard-allergen list, media limits) in
`@repo/core`, and expose REST modules from the NestJS `api` mirroring `restaurants/`
(categories, menu-items, allergens, tags, options, availability, media, public menu). Media uploads
go **browser → MinIO (dev) / Cloudflare R2 (prod)** via presigned `PUT` URLs the API mints, with a
confirm-and-HEAD-verify step so only real objects become `MediaAsset` rows. The dashboard menu
management UI is built against existing `features/<name>/` patterns and `@dnd-kit` reorder; the
**customer visual menu is deferred to the incoming design** — its endpoint and payload are delivered
and tested now, leaving only a presentation layer. No new auth (tenant binding by `restaurantId` for
management, `slug` for the public menu, reusing feature-002 gating).

See [research.md](./research.md) (§1–§12), [data-model.md](./data-model.md),
[contracts/api.md](./contracts/api.md), [quickstart.md](./quickstart.md).

## Technical Context

**Language/Version**: TypeScript 5.x, strict, `NodeNext`, `noUncheckedIndexedAccess` (per
`@repo/typescript-config`).

**Primary Dependencies**: NestJS 11 (`api`); Next.js 16 (`dashboard`, `customer`); Prisma 7 +
`@prisma/adapter-pg`; Zod 4 (`@repo/schemas`); TanStack Query (`@repo/query`); Base UI + shadcn
`base-nova` + Tailwind v4 (`@repo/ui`); `@repo/api-client`, `@repo/core`, `@repo/i18n`. **New
(catalog-pinned, `api`)**: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` for S3-compatible
presigned uploads + HEAD verify (research §1, §11). Reused: `@dnd-kit/*` (already cataloged) for
dashboard reorder. New `api` env: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, `MEDIA_PUBLIC_BASE_URL`. New dev infra: a **MinIO** service in
`docker-compose.yml`.

**Storage**: PostgreSQL 18 via Prisma driver adapter; **only `api` touches the DB** through
`PrismaService` (8 new delegates). Object storage (media) is S3-compatible — MinIO dev / R2 prod —
reached only from `api`.

**Testing**: Jest for `api` (colocated `*.spec.ts` service units + `test/*.e2e-spec.ts` endpoint
contracts). **`@repo/core` gains a unit-test setup** for the pure helpers (pricing, unit-price,
availability, config validation) — these carry SC-003/SC-004. Frontend validated via quickstart.

**Target Platform**: Web. `api` Node server (`/api`, :3000). `dashboard` (:3001) desktop-first,
subdomain-scoped — gets the menu management UI. `customer` (:3002) mobile-first public storefront —
consumes the public menu (visual UI after design). `admin` (:3003) may reuse the same management
contract if desired (not required this slice).

**Project Type**: Turborepo monorepo — Next.js apps + one NestJS API over shared packages.

**Performance Goals**: Menu of ≤300 items renders < 2s on a typical phone; client-side search
updates < 200ms (SC-002). A staff member builds a minimal menu in < 2 min (SC-001).

**Constraints**: Schema-first contract for every boundary crossing; integer-kuruş money with no
precision loss in stored/effective prices (SC-003); availability in Europe/Istanbul (fixed UTC+3, no
DST) via `Intl` (no date lib); presigned direct upload (no large bytes through Node); media limits
centralized in `@repo/core`; Turkish-only UI strings; dashboard follows existing a11y baseline.

**Scale/Scope**: Small — dozens of restaurants, each a menu of up to a few hundred items across
~10–20 categories; authoring is infrequent, reads are frequent.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Schema-First Contract (NON-NEGOTIABLE) | All new payloads (category/item/allergen/tag/option-group/option/availability/media + public `MenuTree` + shared `reorderSchema`) defined in `@repo/schemas`; new failures get `ErrorCode`s + Turkish `@repo/i18n` mappings (research §10); requests validated by `ZodValidationPipe`; every client call via `apiFetch`. | ✅ PASS — designed in contracts. |
| II. Strict Layering & Dependency Direction | Only `api` touches DB + object storage (8 new `PrismaService` delegates); pure logic in `@repo/core` (no framework imports); `@repo/schemas`→`@repo/core` only; no app imported by a package. `@repo/core` & `@repo/schemas` stay compiled (api consumers); `@aws-sdk/*` confined to `api`. | ✅ PASS |
| III. Type Safety & Boundary Validation | Every endpoint validates input with Zod at the boundary (incl. media grant/confirm, reorder id-sets, availability windows); responses validated client-side; presigned-upload inputs (type/mime/size) validated before a URL is minted **and** re-verified via HEAD on confirm; strict TS, no suppressions planned. | ✅ PASS |
| IV. Test Discipline for Contracts & Services | New service logic (uniqueness guards, category-not-empty, standard-allergen protection, allergen seeding + backfill, media cap/limit/confirm-HEAD, availability replace) + the `@repo/core` pure helpers get unit specs; endpoint contracts get e2e tests; a new `@repo/core` test runner is added. | ✅ PASS — enumerated in `/speckit-tasks`. |
| V. Localization & Convention Consistency | New strings via `@repo/i18n` (Turkish); new deps catalog-pinned (`@aws-sdk/*`); compose `@repo/ui` primitives + reuse `@dnd-kit` (no forked UI); per-feature `features/<name>/` convention; Prettier/ESLint enforced. | ✅ PASS |

**Result**: PASS (initial and post-design). No deviations → Complexity Tracking empty.

Post-Phase-1 re-check: the design adds object storage as a second external boundary from `api`; it
stays within Principle II (only `api` reaches it) and Principle III (validated at grant + verified
at confirm). No new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/003-menu-domain/
├── plan.md              # This file (/speckit-plan)
├── research.md          # Phase 0 — §1–§12 decisions
├── data-model.md        # Phase 1 — 8 models, 3 enums, m2m, delegates
├── quickstart.md        # Phase 1 — validation guide
├── contracts/
│   └── api.md           # Phase 1 — REST contract (management + public)
├── checklists/
│   └── requirements.md  # from /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/
├── db/prisma/schema.prisma          # + ServingUnit/DayOfWeek/MediaType enums; Category, MenuItem,
│                                     #   Allergen, Tag, OptionGroup, Option, AvailabilityWindow,
│                                     #   MediaAsset; item↔allergen & item↔tag implicit m2m
├── core/src/
│   ├── unit-price.ts                 # NEW — normalize price → per kg/L/piece (display)
│   ├── options.ts                    # NEW — effectivePriceMinor + validateConfiguration (pure)
│   ├── availability.ts               # NEW — isOrderableNow (pure; caller supplies local now)
│   ├── allergens.ts                  # NEW — STANDARD_ALLERGENS (TR) constant
│   ├── media-limits.ts               # NEW — caps, allowed types, max sizes
│   └── index.ts                      # export the above
├── schemas/src/
│   ├── category.ts menu-item.ts allergen.ts tag.ts option.ts availability.ts media.ts menu.ts  # NEW
│   ├── common.ts                     # NEW — shared reorderSchema {ids}
│   ├── errors.ts                     # + CATEGORY_*/MENU_ITEM_*/ALLERGEN_*/TAG_*/OPTION_*/MEDIA_*/AVAILABILITY_*
│   └── index.ts                      # export all new schemas
└── i18n/src/error-messages.ts        # + Turkish for the new codes

apps/
├── api/src/
│   ├── prisma/prisma.service.ts      # + 8 delegates
│   ├── storage/                      # NEW — S3Service (presign PUT, HEAD verify, delete, public URL)
│   ├── restaurants/restaurants.service.ts  # create-tx also seeds STANDARD_ALLERGENS
│   ├── categories/                   # NEW module — CRUD + reorder + not-empty guard
│   ├── menu-items/                   # NEW module — CRUD + reorder + option-groups/options + availability + media subroutes
│   ├── allergens/                    # NEW module — CRUD + standard-protected guard
│   ├── tags/                         # NEW module — CRUD
│   └── menu/                         # NEW module — public GET by-slug (active-gated) → MenuTree
│       └── *.controller.ts · *.service.ts · *.module.ts · *.service.spec.ts
│   └── (test/*.e2e-spec.ts for the contract flows)
├── dashboard/                        # STAFF menu management (existing patterns, no separate design)
│   ├── app/s/[slug]/menu/            # NEW route(s) — menu management surface (separate from setup)
│   └── features/{categories,menu-items,allergens,tags}/   # api.ts · queries.ts · use-*.ts
│       └── components/*              # category/item lists (dnd reorder), item editor (price, info,
│                                     #   allergens, tags, option groups, availability), media uploader, search
└── customer/                         # PUBLIC menu consumption
    └── features/menu/                # NEW — api.ts (GET by-slug) + queries.ts; in-memory search util
                                      #   (visual menu UI: built after the design handoff — research §12)

docker-compose.yml                    # + minio service (+ bucket init)
```

**Structure Decision**: Keep the Turborepo layout and the per-feature `features/<name>/` convention
(api/queries/use-* + server-component prefetch/dehydrate). New API modules mirror `restaurants/`
exactly (controller + service + module + spec), with menu-item sub-resources (option groups,
options, availability, media) nested under the `menu-items` module to keep the item the aggregate
root. Pure domain logic lives in `@repo/core` so the **future adisyon reuses pricing, configuration
validation, and orderability unchanged** — this is the main forward-looking boundary. Object storage
is isolated behind a single `api` `storage/S3Service`, env-selected between MinIO and R2 (one code
path). The dashboard gains a dedicated **`/s/[slug]/menu`** management surface (distinct from the
setup wizard), per the product direction to separate daily operations from configuration. The
**customer visual menu is intentionally deferred** to the incoming design; the public endpoint +
`MenuTree` contract are completed and tested now, so that work is later pure presentation.

## Complexity Tracking

> No constitution violations — section intentionally empty.
