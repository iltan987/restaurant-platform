# API Contract: Menu Domain

**Feature**: `003-menu-domain` · NestJS `api`, base prefix `/api`. Every request body validated by
`ZodValidationPipe` with a schema from `@repo/schemas`; every response validated client-side via
`apiFetch`. Errors use the global `{ statusCode, code, message }` envelope with `ErrorCode`s.

Conventions reused from features 001/002: cuid2 ids, `position` ordering, batch-reorder PUTs,
P2002-guarded uniqueness throws, list endpoints scoped by restaurant. Restaurant scope is by
`restaurantId` for management (admin/dashboard) and by `slug` for the public menu.

Legend: 🔒 management (dashboard/admin) · 🌐 public (customer).

---

## Categories  🔒

| Method | Path | Body → Response | Errors |
|---|---|---|---|
| GET | `/restaurants/:rid/categories` | → `Category[]` (ordered, incl. hidden) | RESTAURANT_NOT_FOUND |
| POST | `/restaurants/:rid/categories` | `createCategorySchema {name}` → `Category` | CATEGORY_NAME_TAKEN |
| PATCH | `/categories/:id` | `updateCategorySchema {name?, isHidden?}` → `Category` | CATEGORY_NOT_FOUND, CATEGORY_NAME_TAKEN |
| DELETE | `/categories/:id` | → `204` | CATEGORY_NOT_FOUND, CATEGORY_NOT_EMPTY |
| PUT | `/restaurants/:rid/categories/order` | `reorderSchema {ids: string[]}` → `Category[]` | CATEGORY_NOT_FOUND |

## Menu items  🔒

| Method | Path | Body → Response | Errors |
|---|---|---|---|
| GET | `/categories/:cid/items` | → `MenuItem[]` (with attributes) | CATEGORY_NOT_FOUND |
| POST | `/categories/:cid/items` | `createMenuItemSchema` → `MenuItem` | CATEGORY_NOT_FOUND |
| GET | `/menu-items/:id` | → `MenuItem` (full: options, allergens, tags, media, windows) | MENU_ITEM_NOT_FOUND |
| PATCH | `/menu-items/:id` | `updateMenuItemSchema {name?, description?, priceMinor?, inStock?, calories?, servingAmount?, servingUnit?, allergenIds?, tagIds?}` → `MenuItem` | MENU_ITEM_NOT_FOUND |
| DELETE | `/menu-items/:id` | → `204` (cascades children) | MENU_ITEM_NOT_FOUND |
| PUT | `/categories/:cid/items/order` | `reorderSchema {ids}` → `MenuItem[]` | MENU_ITEM_NOT_FOUND |

`createMenuItemSchema`: `{ name, priceMinor, description?, calories?, servingAmount?, servingUnit?,
inStock?, allergenIds?, tagIds? }`. Allergen/tag assignment is by id arrays (set semantics).

## Allergens  🔒

| Method | Path | Body → Response | Errors |
|---|---|---|---|
| GET | `/restaurants/:rid/allergens` | → `Allergen[]` (standard + custom) | RESTAURANT_NOT_FOUND |
| POST | `/restaurants/:rid/allergens` | `createAllergenSchema {label}` → `Allergen` (isStandard:false) | ALLERGEN_LABEL_TAKEN |
| PATCH | `/allergens/:id` | `updateAllergenSchema {label}` → `Allergen` | ALLERGEN_NOT_FOUND, ALLERGEN_LABEL_TAKEN |
| DELETE | `/allergens/:id` | → `204` (removes assignments from items) | ALLERGEN_NOT_FOUND, ALLERGEN_STANDARD_PROTECTED |

## Tags  🔒

| Method | Path | Body → Response | Errors |
|---|---|---|---|
| GET | `/restaurants/:rid/tags` | → `Tag[]` | RESTAURANT_NOT_FOUND |
| POST | `/restaurants/:rid/tags` | `createTagSchema {label, color?}` → `Tag` | TAG_LABEL_TAKEN |
| PATCH | `/tags/:id` | `updateTagSchema {label?, color?}` → `Tag` | TAG_NOT_FOUND, TAG_LABEL_TAKEN |
| DELETE | `/tags/:id` | → `204` (removes assignments) | TAG_NOT_FOUND |

## Option groups & options  🔒

| Method | Path | Body → Response | Errors |
|---|---|---|---|
| POST | `/menu-items/:id/option-groups` | `createOptionGroupSchema {name, minSelect, maxSelect?, required}` → `OptionGroup` | MENU_ITEM_NOT_FOUND, INVALID_OPTION_CONFIG |
| PATCH | `/option-groups/:gid` | `updateOptionGroupSchema` → `OptionGroup` | OPTION_GROUP_NOT_FOUND, INVALID_OPTION_CONFIG |
| DELETE | `/option-groups/:gid` | → `204` | OPTION_GROUP_NOT_FOUND |
| PUT | `/menu-items/:id/option-groups/order` | `reorderSchema {ids}` → `OptionGroup[]` | OPTION_GROUP_NOT_FOUND |
| POST | `/option-groups/:gid/options` | `createOptionSchema {name, priceDeltaMinor, defaultSelected, isAvailable}` → `Option` | OPTION_GROUP_NOT_FOUND |
| PATCH | `/options/:oid` | `updateOptionSchema` → `Option` | OPTION_NOT_FOUND |
| DELETE | `/options/:oid` | → `204` | OPTION_NOT_FOUND |
| PUT | `/option-groups/:gid/options/order` | `reorderSchema {ids}` → `Option[]` | OPTION_NOT_FOUND |

`INVALID_OPTION_CONFIG` ⇐ group invariant violated (e.g. `maxSelect < minSelect`, `required` with
`minSelect 0`).

## Availability windows  🔒

| Method | Path | Body → Response | Errors |
|---|---|---|---|
| PUT | `/menu-items/:id/availability` | `setAvailabilitySchema {windows: [{days, startMin, endMin}]}` → `AvailabilityWindow[]` (full replace) | MENU_ITEM_NOT_FOUND, AVAILABILITY_WINDOW_INVALID |

Replace-all semantics (the editor sends the full set). Empty array = always available.

## Media  🔒

| Method | Path | Body → Response | Errors |
|---|---|---|---|
| POST | `/menu-items/:id/media/upload-url` | `requestUploadSchema {type, mimeType, sizeBytes}` → `{ uploadUrl, storageKey, expiresInSec }` | MENU_ITEM_NOT_FOUND, MEDIA_LIMIT_REACHED, MEDIA_TYPE_NOT_ALLOWED, MEDIA_TOO_LARGE |
| POST | `/menu-items/:id/media` | `confirmMediaSchema {storageKey, type}` → `MediaAsset` (after HEAD verify) | MENU_ITEM_NOT_FOUND, MEDIA_OBJECT_NOT_FOUND, MEDIA_TOO_LARGE, MEDIA_TYPE_NOT_ALLOWED, MEDIA_LIMIT_REACHED |
| DELETE | `/media/:mid` | → `204` (also deletes object best-effort) | MEDIA_OBJECT_NOT_FOUND |
| PUT | `/menu-items/:id/media/order` | `reorderSchema {ids}` → `MediaAsset[]` | MENU_ITEM_NOT_FOUND |

Direct upload: browser `PUT`s bytes to `uploadUrl` between the two POSTs (see research §1).

## Public menu  🌐

| Method | Path | Response | Errors |
|---|---|---|---|
| GET | `/menu/by-slug/:slug` | `MenuTree` — visible categories (ordered) → visible items with all public attributes, options, allergens, tags, media (public URLs), and computed `orderableNow {ok, reason?}` per item | RESTAURANT_NOT_FOUND (incl. non-ACTIVE) |

`MenuTree` is the single payload the customer app loads; client-side search (research §6) filters it
in-memory. Media public URLs are composed from `storageKey` + `MEDIA_PUBLIC_BASE_URL`.

---

## Schema package layout (`@repo/schemas/src/`)

New files: `category.ts`, `menu-item.ts`, `allergen.ts`, `tag.ts`, `option.ts` (groups+options),
`availability.ts`, `media.ts`, `menu.ts` (public `MenuTree`), plus a shared `reorderSchema` (in
`pagination.ts`'s spirit or a new `common.ts`). `errors.ts` gains the new codes; `index.ts` exports
all. `@repo/i18n/src/error-messages.ts` gains Turkish for each new code.

## Core package additions (`@repo/core/src/`)

`unit-price.ts`, `options.ts` (pricing + config validation), `availability.ts` (orderable-now),
`allergens.ts` (standard set constant), `media-limits.ts` (caps/types/sizes constants).
