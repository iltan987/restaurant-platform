# Phase 1 Contract: REST API

The external contract is the NestJS REST API under the `/api` prefix, consumed by `admin`, `dashboard`, and `customer` via `apiFetch` + `@repo/schemas`. Every error conforms to `{ statusCode, code, message }` (global `HttpExceptionFilter`); `code` is from `ErrorCode`. Request bodies are validated with `ZodValidationPipe(<schema>)`.

All schemas live in `@repo/schemas` (`restaurant.ts`, `floor.ts`, `area.ts`, `table.ts`, `pagination.ts`). Frontend wrappers validate responses against them. The hierarchy is **Restaurant → Floor → Area → Table**. The `admin` and `dashboard` apps call the **same** endpoints (admin renders a plain management UI; no admin-only endpoints).

## Shared schemas (additions)

```
# errors.ts — ErrorCode additions
TABLE_LABEL_TAKEN
TABLE_NOT_FOUND
GO_LIVE_REQUIRES_TABLE
FLOOR_NAME_TAKEN
AREA_NAME_TAKEN
FLOOR_NOT_FOUND
AREA_NOT_FOUND
FLOOR_NOT_EMPTY
AREA_NOT_EMPTY

# pagination.ts (NEW)
paginationQuerySchema   # { page?: int>=1 (default 1), pageSize?: int 1..500 }
paginated(itemSchema)   # helper → { items: itemSchema[], total: int, page: int, pageSize: int }

# restaurant.ts
restaurantSchema            # + onboardingStatus: "IN_PROGRESS" | "COMPLETED" | "SKIPPED"
                            #   (status: "ACTIVE" | "INACTIVE" already present)
updateRestaurantSchema      # { name?: 1..120, slug?: slug-rules }            (admin edit)
restaurantStatusSchema      # { status: "ACTIVE" | "INACTIVE" }               (go live / deactivate)
onboardingStatusSchema      # { onboardingStatus: "COMPLETED" | "SKIPPED" }   (finish / skip)

# floor.ts (NEW)
floorSchema                 # { id, restaurantId, name, position, createdAt, updatedAt }
createFloorSchema           # { name: 1..60, position?: int>=0 }
updateFloorSchema           # { name?: 1..60, position?: int>=0 }

# area.ts (NEW)
areaSchema                  # { id, floorId, name, position, createdAt, updatedAt }
createAreaSchema            # { name: 1..60, position?: int>=0 }
updateAreaSchema            # { name?: 1..60, position?: int>=0 }

# table.ts (NEW)
tableSchema                 # { id, areaId, label, capacity?: number|null,
                            #   positionX?: number|null, positionY?: number|null, createdAt, updatedAt }
createTableSchema           # { label: 1..40, capacity?: int>=1 }              (areaId from path)
updateTableSchema           # { label?: 1..40, capacity?: int>=1|null, areaId?: cuid,
                            #   positionX?: 0..1|null, positionY?: 0..1|null }  (rename / move / reposition)
createTablesBulkSchema      # { count: int 1..200, startNumber?: int>=1, labelPrefix?: <=20 }
floorLayoutSchema           # { positions: { tableId: cuid, x: 0..1, y: 0..1 }[] }  (batch canvas save)
```

## Restaurant endpoints

| Method | Path | Body / Query | Success | Errors |
|---|---|---|---|---|
| POST | `/restaurants` | `createRestaurantSchema` | 201 `restaurantSchema` (status `INACTIVE`, onboarding `IN_PROGRESS`; default floor + area created) | `SLUG_TAKEN`, `VALIDATION_ERROR` |
| GET | `/restaurants` | `paginationQuerySchema` (pageSize **20**) | 200 `paginated(restaurantSchema)` (desc by createdAt) | — |
| GET | `/restaurants/:slug` | — | 200 `restaurantSchema` | `RESTAURANT_NOT_FOUND` |
| PATCH | `/restaurants/:id` | `updateRestaurantSchema` | 200 `restaurantSchema` | `SLUG_TAKEN`, `RESTAURANT_NOT_FOUND`, `VALIDATION_ERROR` |
| PATCH | `/restaurants/:id/status` | `restaurantStatusSchema` | 200 `restaurantSchema` | `GO_LIVE_REQUIRES_TABLE` (409), `RESTAURANT_NOT_FOUND` |
| PATCH | `/restaurants/:id/onboarding` | `onboardingStatusSchema` | 200 `restaurantSchema` | `RESTAURANT_NOT_FOUND` |
| DELETE | `/restaurants/:id` | — | 204 (cascades floors→areas→tables) | `RESTAURANT_NOT_FOUND` |

- `GET /restaurants/:slug` is the tenant lookup used by `dashboard`, `customer`, and `admin`. `:slug` = public lookup, `:id` = mutations (unambiguous).
- `PATCH …/status` to `ACTIVE` enforces ≥1 table → `GO_LIVE_REQUIRES_TABLE`.

## Floor endpoints

| Method | Path | Body / Query | Success | Errors |
|---|---|---|---|---|
| GET | `/restaurants/:slug/floors` | `paginationQuerySchema` (pageSize **200**) | 200 `paginated(floorSchema)` (by `position`) | `RESTAURANT_NOT_FOUND` |
| POST | `/restaurants/:id/floors` | `createFloorSchema` | 201 `floorSchema` | `FLOOR_NAME_TAKEN` (409), `RESTAURANT_NOT_FOUND`, `VALIDATION_ERROR` |
| PATCH | `/floors/:id` | `updateFloorSchema` | 200 `floorSchema` | `FLOOR_NAME_TAKEN`, `FLOOR_NOT_FOUND`, `VALIDATION_ERROR` |
| DELETE | `/floors/:id` | — | 204 | `FLOOR_NOT_FOUND`, `FLOOR_NOT_EMPTY` (409) |
| PUT | `/floors/:id/layout` | `floorLayoutSchema` | 200 `tableSchema[]` (updated) | `FLOOR_NOT_FOUND`, `TABLE_NOT_FOUND`, `VALIDATION_ERROR` |

- `DELETE /floors/:id` → `FLOOR_NOT_EMPTY` when the floor still has areas (FR-041).
- `PUT …/layout` batch-saves canvas positions for the floor's tables on drop (FR-042); positions are normalized `0..1`.

## Area endpoints

| Method | Path | Body / Query | Success | Errors |
|---|---|---|---|---|
| GET | `/restaurants/:slug/areas` | `paginationQuerySchema` (pageSize **200**), `?floorId?` | 200 `paginated(areaSchema)` (by `position`) | `RESTAURANT_NOT_FOUND` |
| POST | `/floors/:id/areas` | `createAreaSchema` | 201 `areaSchema` | `AREA_NAME_TAKEN` (409), `FLOOR_NOT_FOUND`, `VALIDATION_ERROR` |
| PATCH | `/areas/:id` | `updateAreaSchema` | 200 `areaSchema` | `AREA_NAME_TAKEN`, `AREA_NOT_FOUND`, `VALIDATION_ERROR` |
| DELETE | `/areas/:id` | — | 204 | `AREA_NOT_FOUND`, `AREA_NOT_EMPTY` (409) |

- `DELETE /areas/:id` → `AREA_NOT_EMPTY` when the area still has tables (FR-041).

## Table endpoints

| Method | Path | Body / Query | Success | Errors |
|---|---|---|---|---|
| GET | `/restaurants/:slug/tables` | `paginationQuerySchema` (pageSize **200**) | 200 `paginated(tableSchema)` | `RESTAURANT_NOT_FOUND` |
| GET | `/restaurants/:slug/tables/:tableId` | — | 200 `tableSchema` | `RESTAURANT_NOT_FOUND`, `TABLE_NOT_FOUND` |
| POST | `/areas/:id/tables` | `createTableSchema` | 201 `tableSchema` | `TABLE_LABEL_TAKEN` (409), `AREA_NOT_FOUND`, `VALIDATION_ERROR` |
| POST | `/areas/:id/tables/bulk` | `createTablesBulkSchema` | 201 `tableSchema[]` | `TABLE_LABEL_TAKEN`, `AREA_NOT_FOUND`, `VALIDATION_ERROR` |
| PATCH | `/tables/:id` | `updateTableSchema` | 200 `tableSchema` | `TABLE_LABEL_TAKEN`, `TABLE_NOT_FOUND`, `AREA_NOT_FOUND`, `VALIDATION_ERROR` |
| DELETE | `/tables/:id` | — | 204 | `TABLE_NOT_FOUND` |

- Public reads (`customer`) use the `:slug` table routes; staff/admin mutations use `:id` routes.
- Table **label uniqueness is per restaurant** (service resolves the restaurant via `area → floor`); a duplicate → `TABLE_LABEL_TAKEN`.
- `POST …/bulk` creates `count` tables labeled from `startNumber` (default 1) with optional `labelPrefix`, atomically (`$transaction`).
- `PATCH /tables/:id` covers rename, capacity, **area reassignment** (`areaId`), and **single-table reposition** (`positionX/positionY`). Batch repositioning uses `PUT /floors/:id/layout`.

## i18n (Turkish) — new messages

```
TABLE_LABEL_TAKEN      → "Bu masa adı zaten kullanımda."
TABLE_NOT_FOUND        → "Masa bulunamadı."
GO_LIVE_REQUIRES_TABLE → "Yayına almak için en az bir masa eklemelisiniz."
FLOOR_NAME_TAKEN       → "Bu kat adı zaten kullanımda."
AREA_NAME_TAKEN        → "Bu bölge adı zaten kullanımda."
FLOOR_NOT_FOUND        → "Kat bulunamadı."
AREA_NOT_FOUND         → "Bölge bulunamadı."
FLOOR_NOT_EMPTY        → "Bu katı silmeden önce içindeki bölgeleri kaldırmalısınız."
AREA_NOT_EMPTY         → "Bu bölgeyi silmeden önce içindeki masaları kaldırmalısınız."
```

## Pagination conventions

- Every list endpoint accepts `?page` (≥1, default 1) and `?pageSize` (clamped to the per-surface max) and returns `paginated(...)` = `{ items, total, page, pageSize }`.
- Default page sizes: restaurants **20**; floors / areas / tables **200**.
- Clients render a pager **only when `total > pageSize`** (FR-046); query keys include `page`/`pageSize`.

## Client wrappers (per app, over `apiFetch`)

- `admin/features/restaurants/api.ts`: `listRestaurants(page)`, `updateRestaurant`, `deleteRestaurant`, `setRestaurantStatus`. `admin/features/{floors,areas,tables}/api.ts`: full CRUD + bulk (same endpoints as dashboard) for the plain management view.
- `dashboard/features/restaurants/api.ts`: status/onboarding mutations + `fetchRestaurantBySlug`. `dashboard/features/{floors,areas,tables}/api.ts`: list/create/update/delete, bulk, and `saveFloorLayout` (PUT layout).
- `customer/features/restaurants/api.ts`: `fetchRestaurantBySlug` (404→null). `customer/features/tables/api.ts`: `fetchTable(slug, tableId)` (404→null).

All wrappers validate responses against the `@repo/schemas` shapes and surface `ApiError.code` → `getErrorMessage` (TR) at call sites.
