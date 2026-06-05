# Phase 1 Data Model: Restaurant Onboarding & Setup

Source of truth: Prisma schema in `packages/db/prisma/schema.prisma`, mirrored as Zod schemas in `packages/schemas/src`. Changes are additive except the `Restaurant.status` default flip. Hierarchy: **Restaurant → Floor → Area → Table**.

## Enums

```prisma
enum RestaurantStatus {   // EXISTING — unchanged values
  ACTIVE
  INACTIVE
}

enum OnboardingStatus {   // NEW
  IN_PROGRESS
  COMPLETED
  SKIPPED
}
```

## Entity: Restaurant (modified)

| Field | Type | Notes |
|---|---|---|
| id | String cuid | PK (existing) |
| name | String | 1–120 chars (existing) |
| slug | String @unique | slug rules from `@repo/core` (existing) |
| status | RestaurantStatus | **default changed `ACTIVE` → `INACTIVE`** — visibility gate |
| onboardingStatus | OnboardingStatus | **NEW**, default `IN_PROGRESS` — drives wizard vs management |
| createdAt / updatedAt | DateTime | existing |
| floors | Floor[] | **NEW** relation (owns floors → areas → tables) |

**Rules**
- Created `INACTIVE` + `IN_PROGRESS` (FR-004), **with a default floor "Zemin Kat" and default area "Genel"** in the same `$transaction` (FR-039).
- `status` `INACTIVE → ACTIVE` ("go live") **only if** the restaurant has ≥1 table (FR-016/FR-017); else `GO_LIVE_REQUIRES_TABLE`. `ACTIVE → INACTIVE` always allowed (FR-007/FR-020).
- `onboardingStatus`: `IN_PROGRESS → COMPLETED|SKIPPED`; either terminal value shows the management view (FR-019). Going live does not require terminal onboarding, and finishing/skipping does not auto-activate.
- Slug edit on an `ACTIVE` restaurant → caller warned old links/QRs break (FR-008); uniqueness re-checked (`SLUG_TAKEN`).
- Deleting a restaurant cascades floors → areas → tables (admin, confirmed — FR-007).

## Entity: Floor (new)

| Field | Type | Notes |
|---|---|---|
| id | String cuid | PK |
| restaurantId | String | FK → Restaurant, `onDelete: Cascade` |
| name | String | 1–60 chars (e.g. "Zemin Kat", "1. Kat") |
| position | Int | display order, default 0 |
| createdAt / updatedAt | DateTime | |
| areas | Area[] | relation |

**Constraints**
- `@@unique([restaurantId, name])` → `FLOOR_NAME_TAKEN` (P2002 guard). `@@index([restaurantId])`.
- Manual removal **blocked at the service layer** when the floor still has areas → `FLOOR_NOT_EMPTY` (FR-041). (DB FK is Cascade, used only for restaurant-level cascade delete.)

## Entity: Area (new)

| Field | Type | Notes |
|---|---|---|
| id | String cuid | PK |
| floorId | String | FK → Floor, `onDelete: Cascade` |
| name | String | 1–60 chars (e.g. "Bahçe", "Pencere kenarı") |
| position | Int | display order, default 0 |
| createdAt / updatedAt | DateTime | |
| tables | Table[] | relation |

**Constraints**
- `@@unique([floorId, name])` → `AREA_NAME_TAKEN`. Same name allowed on different floors. `@@index([floorId])`.
- Manual removal **blocked at the service layer** when the area still has tables → `AREA_NOT_EMPTY` (FR-041).

## Entity: Table (new/modified vs prior plan)

| Field | Type | Notes |
|---|---|---|
| id | String cuid | PK — **stable identity used by the QR link** (FR-018/FR-022) |
| areaId | String | **FK → Area, required**, `onDelete: Cascade` — table lives in exactly one area (FR-038) |
| label | String | 1–40 chars; human-facing (e.g. "5", "Bahçe 3") |
| capacity | Int? | optional, ≥1 if present |
| positionX | Float? | **NEW** normalized `0..1` x on the floor canvas; `null` ⇒ default layout (FR-043) |
| positionY | Float? | **NEW** normalized `0..1` y; `null` ⇒ default layout |
| createdAt / updatedAt | DateTime | |

**Constraints**
- `@@unique([areaId, label])`? **No** — label is unique **per restaurant**, not per area. Since `Table` references `Area` (not `Restaurant`) directly, restaurant-scoped label uniqueness is enforced in the **service** (look up sibling tables across the restaurant's areas) and surfaced as `TABLE_LABEL_TAKEN`. `@@index([areaId])` for list/canvas queries.
- `area`/`area` (the `area: String?` field from the earlier minimal plan) is **removed** — superseded by the `areaId` relation.
- Cascade delete with its area/floor/restaurant; deleting a table removes it (its derived QR ceases to resolve — FR-026). Canvas position is presentational only and never affects the QR (FR-045).

> **Label-uniqueness note**: enforcing "unique per restaurant" without a denormalized `restaurantId` column means the service validates against `prisma.table.findFirst({ where: { area: { floor: { restaurantId } }, label } })` (or an equivalent count) before create/update/rename. If this proves hot, add a denormalized `restaurantId` to `Table` with `@@unique([restaurantId, label])` in a follow-up — deferred (volumes are small).

## Derived: Table QR Code (not persisted)

- Not a DB row. Fully derived: `https://<restaurant.slug>.<NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN>/t/<table.id>` (the customer storefront origin).
- Rendered client-side (dashboard). Stable across label renames and canvas moves (uses `id`); changes only if the **slug** changes (admin warned, FR-008).

## Visual floor-plan canvas (no separate entity)

- The "canvas" is a **per-floor view** over that floor's tables; its only persisted state is `Table.positionX/positionY`. No `Canvas` table.
- Default layout: tables with `null` position are auto-arranged (grid, grouped by area) at render time (FR-043).

## PrismaService delegates

Add to `apps/api/src/prisma/prisma.service.ts` (one delegate per model): `readonly floor = prisma.floor`, `readonly area = prisma.area`, `readonly table = prisma.table`.

## Migration

Single Prisma migration: add `OnboardingStatus`; add `Restaurant.onboardingStatus` (default `IN_PROGRESS`); flip `Restaurant.status` default to `INACTIVE`; create `Floor`, `Area`, `Table` tables with their unique constraints, indexes, and Cascade FKs (`Restaurant`→`Floor`→`Area`→`Table`). Existing dev rows keep their current `status`. Run `pnpm --filter @repo/db db:migrate` then `db:generate`.

> Because `Table` did not previously exist in the DB, there is no `area: String` column to migrate away from — the earlier "minimal" plan was never applied.
