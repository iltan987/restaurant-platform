# Phase 1 Data Model: Menu Domain

**Feature**: `003-menu-domain` · **Date**: 2026-06-10 · **Store**: PostgreSQL 18 via Prisma 7

All new models hang off the existing `Restaurant`. Money is **integer minor units (kuruş)**
throughout (`*Minor` fields). New Prisma delegates are added to `PrismaService`. Item↔Tag and
Item↔Allergen are **implicit many-to-many** (no extra columns → no join model/delegate needed).

---

## Enums

```prisma
enum ServingUnit {
  GRAM
  KILOGRAM
  MILLILITER
  LITER
  PIECE      // adet
  PORTION    // porsiyon (no unit price)
}

enum DayOfWeek {
  MON TUE WED THU FRI SAT SUN
}

enum MediaType {
  PHOTO
  VIDEO
}
```

---

## Models

### Category
Named grouping of items within a restaurant; ordered; can be hidden from diners.

| Field | Type | Notes |
|---|---|---|
| id | String cuid2 | PK |
| restaurantId | String | FK → Restaurant, `onDelete: Cascade` |
| name | String | unique within restaurant |
| position | Int @default(0) | drag-reorder |
| isHidden | Boolean @default(false) | excluded from diner menu when true |
| createdAt/updatedAt | DateTime | |

Constraints: `@@unique([restaurantId, name])`, `@@index([restaurantId])`.
Delete guard (service): blocked if it has items → `CATEGORY_NOT_EMPTY`.

### MenuItem
A sellable entry. A plain flat-price item is just this row with empty children.

| Field | Type | Notes |
|---|---|---|
| id | String cuid2 | PK |
| restaurantId | String | FK → Restaurant, `onDelete: Cascade` (denormalized for tenant-scoped queries/uniqueness of search) |
| categoryId | String | FK → Category, `onDelete: Restrict` (category delete guarded) |
| name | String | |
| description | String? | |
| priceMinor | Int | base price, kuruş, ≥ 0 |
| inStock | Boolean @default(true) | "tükendi" toggle |
| calories | Int? | kcal |
| servingAmount | Decimal? | positive; with unit → unit price |
| servingUnit | ServingUnit? | |
| position | Int @default(0) | order within category |
| createdAt/updatedAt | DateTime | |

Relations: `optionGroups OptionGroup[]`, `media MediaAsset[]`, `availabilityWindows
AvailabilityWindow[]`, `allergens Allergen[]` (m2m), `tags Tag[]` (m2m).
Constraints: `@@index([restaurantId])`, `@@index([categoryId])`.
Children (option groups, options, media, windows) `onDelete: Cascade` from the item.

### Allergen
Reusable per-restaurant allergen label; standard (seeded) or custom.

| Field | Type | Notes |
|---|---|---|
| id | String cuid2 | PK |
| restaurantId | String | FK → Restaurant, `onDelete: Cascade` |
| label | String | unique within restaurant |
| isStandard | Boolean @default(false) | seeded set = true; protected from deletion |
| createdAt/updatedAt | DateTime | |

Relation: `items MenuItem[]` (m2m). Constraints: `@@unique([restaurantId, label])`,
`@@index([restaurantId])`. Delete guard: `isStandard` → `ALLERGEN_STANDARD_PROTECTED`; deleting a
custom allergen removes its item assignments (implicit m2m join rows) without affecting the items.

### Tag
Reusable per-restaurant descriptive label (vegan, acılı…). Searchable.

| Field | Type | Notes |
|---|---|---|
| id | String cuid2 | PK |
| restaurantId | String | FK → Restaurant, `onDelete: Cascade` |
| label | String | unique within restaurant |
| color | String? | optional chip color |
| createdAt/updatedAt | DateTime | |

Relation: `items MenuItem[]` (m2m). Constraints: `@@unique([restaurantId, label])`,
`@@index([restaurantId])`.

### OptionGroup
A customization group on an item (variant / extras / ingredients).

| Field | Type | Notes |
|---|---|---|
| id | String cuid2 | PK |
| itemId | String | FK → MenuItem, `onDelete: Cascade` |
| name | String | e.g. "Boy", "Ekstralar" |
| minSelect | Int @default(0) | |
| maxSelect | Int? | null = unbounded |
| required | Boolean @default(false) | |
| position | Int @default(0) | |

Relation: `options Option[]`. Constraint: `@@index([itemId])`.
Invariant (validated in schema/service): `minSelect >= 0`; `maxSelect == null || maxSelect >= max(1, minSelect)`; `required ⇒ minSelect >= 1`.

### Option
A choice within a group.

| Field | Type | Notes |
|---|---|---|
| id | String cuid2 | PK |
| groupId | String | FK → OptionGroup, `onDelete: Cascade` |
| name | String | e.g. "Orta", "+ Mantar", "Soğan" |
| priceDeltaMinor | Int @default(0) | kuruş, may be 0 |
| defaultSelected | Boolean @default(false) | on-by-default (removable ingredient) |
| isAvailable | Boolean @default(true) | |
| position | Int @default(0) | |

Constraint: `@@index([groupId])`.

### AvailabilityWindow
When an item may be ordered. Absent ⇒ always available.

| Field | Type | Notes |
|---|---|---|
| id | String cuid2 | PK |
| itemId | String | FK → MenuItem, `onDelete: Cascade` |
| days | DayOfWeek[] | non-empty set |
| startMin | Int | minutes since midnight, 0–1439 |
| endMin | Int | 0–1439; `< startMin` ⇒ crosses midnight |

Constraint: `@@index([itemId])`. Invariant: `days` non-empty; `startMin != endMin`.

### MediaAsset
Ordered photo/video for an item (created only after upload is verified).

| Field | Type | Notes |
|---|---|---|
| id | String cuid2 | PK |
| itemId | String | FK → MenuItem, `onDelete: Cascade` |
| type | MediaType | PHOTO \| VIDEO |
| storageKey | String | object key in the bucket (not a full URL) |
| mimeType | String | verified on confirm |
| sizeBytes | Int | verified on confirm |
| position | Int @default(0) | 0 = cover (first PHOTO) |
| createdAt | DateTime | |

Constraint: `@@index([itemId])`. Cap (5/item) enforced in service, not DB.

---

## Relationship summary

```
Restaurant 1─* Category 1─* MenuItem
Restaurant 1─* Allergen *─* MenuItem        (implicit m2m)
Restaurant 1─* Tag      *─* MenuItem        (implicit m2m)
MenuItem  1─* OptionGroup 1─* Option
MenuItem  1─* AvailabilityWindow
MenuItem  1─* MediaAsset
```

## PrismaService delegates to add

`category, menuItem, allergen, tag, optionGroup, option, availabilityWindow, mediaAsset`
(implicit m2m needs no join delegate).

## Derived / computed (not stored)

- **effectivePriceMinor(item, selectedOptionIds)** — base + Σ deltas. `@repo/core/options`.
- **unit price** — normalized per kg/L/piece, rounded display kuruş. `@repo/core/unit-price`.
- **orderableNow + reason** — `inStock && (no windows || now in a window)`, Europe/Istanbul.
  `@repo/core/availability` (pure; caller supplies localized "now").

## Validation rules (enforced at the boundary via `@repo/schemas`, re-checked in services)

- Names/labels: non-empty, trimmed, length-bounded; uniqueness per restaurant (DB unique +
  P2002-guarded service throw, reusing the `SLUG_TAKEN` idiom).
- `priceMinor`, `priceDeltaMinor`: integers ≥ 0 (delta ≥ 0; removals are free by modeling, not
  negative deltas).
- `servingAmount` > 0 when present; `servingUnit` required iff `servingAmount` present.
- Option-group invariants (above); availability-window invariants (above).
- Media: `type`/`mimeType`/`sizeBytes` within `@repo/core` limits; cap 5/item.
- Configuration validation (future adisyon consumer, exercised now in core tests): required groups
  satisfied, selections within min/max, no unavailable/unknown options.

## Migrations

1. Add enums + 8 models + the two implicit m2m join tables (Prisma-managed).
2. Add delegates to `PrismaService`.
3. Seed standard allergens in `restaurants.service` create-transaction (new restaurants).
4. **Idempotent backfill** of standard allergens for pre-existing restaurants (runs once).
