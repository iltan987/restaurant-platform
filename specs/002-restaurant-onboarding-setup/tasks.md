---
description: "Task list for Restaurant Onboarding & Setup implementation"
---

# Tasks: Restaurant Onboarding & Setup

**Input**: Design documents from `specs/002-restaurant-onboarding-setup/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [quickstart.md](./quickstart.md)

**Tests**: Backend tests ARE included — Constitution Principle IV requires `*.spec.ts` unit specs for new service logic and `test/*.e2e-spec.ts` for endpoint contracts. Frontend apps have no test harness today and are validated via [quickstart.md](./quickstart.md).

**Organization**: Tasks are grouped by user story (P1 → P3) so each story can be implemented and verified independently. Hierarchy throughout: **Restaurant → Floor → Area → Table**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story served (US1–US7); Setup/Foundational/Polish carry no story label
- Exact file paths are included in each description

## Path Conventions

Turborepo monorepo: NestJS API at `apps/api/src/`, Next.js apps at `apps/{dashboard,customer,admin}/`, shared packages at `packages/{db,schemas,i18n,core}/`. Only `api` touches the DB. `admin` and `dashboard` call the **same** REST contract.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the dependencies the feature needs (CLI-first; pin shared versions in the workspace catalog).

- [X] T001 [P] Add QR + canvas deps to the dashboard via `pnpm --filter dashboard add qrcode.react @dnd-kit/core @dnd-kit/utilities`, then move the versions to `pnpm-workspace.yaml` `catalog:` and reference them as `"catalog:"` in `apps/dashboard/package.json`. Also add `NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN` to `apps/dashboard/.env.example` (+ local `.env`) — the QR target origin. (`qrcode.react@4.2.0` is self-typed — no `@types/*`; `@dnd-kit/accessibility` is a transitive dep of core — do not install it. Free-xy uses `useDraggable`, not `@dnd-kit/sortable`.)
- [X] T002 [P] Add the shared contract deps to the customer app via `pnpm --filter customer add @repo/api-client @repo/query @repo/schemas zod` (catalog refs); confirm `apps/customer/package.json` mirrors the other Next apps' data-fetching stack.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, the shared client↔server contract, and the Prisma delegates — every user story depends on these.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [X] T003 Update the Prisma schema in `packages/db/prisma/schema.prisma`: add `enum OnboardingStatus { IN_PROGRESS COMPLETED SKIPPED }`; add `Restaurant.onboardingStatus @default(IN_PROGRESS)`; **flip `Restaurant.status` default `ACTIVE`→`INACTIVE`**; add `Floor` (`restaurantId` FK Cascade, `name`, `position`, `@@unique([restaurantId, name])`, `@@index([restaurantId])`), `Area` (`floorId` FK Cascade, `name`, `position`, `@@unique([floorId, name])`, `@@index([floorId])`), and `Table` (`areaId` FK Cascade, `label`, `capacity Int?`, `positionX Float?`, `positionY Float?`, `@@index([areaId])`) with the `Restaurant→Floor→Area→Table` relations. (No `@@unique` on table label — enforced per-restaurant in the service.)
- [X] T004 Create the migration and regenerate the client: `pnpm --filter @repo/db db:migrate` then `pnpm --filter @repo/db db:generate`. Depends on T003.
- [X] T005 Add `readonly floor = prisma.floor`, `readonly area = prisma.area`, `readonly table = prisma.table` to `apps/api/src/prisma/prisma.service.ts`. Depends on T004.
- [X] T006 [P] Add the new `ErrorCode`s in `packages/schemas/src/errors.ts`: `TABLE_LABEL_TAKEN`, `TABLE_NOT_FOUND`, `GO_LIVE_REQUIRES_TABLE`, `FLOOR_NAME_TAKEN`, `AREA_NAME_TAKEN`, `FLOOR_NOT_FOUND`, `AREA_NOT_FOUND`, `FLOOR_NOT_EMPTY`, `AREA_NOT_EMPTY`.
- [X] T007 [P] Add the Turkish messages for all nine new codes in `packages/i18n/src/error-messages.ts` (strings per [contracts/api.md](./contracts/api.md) i18n section).
- [X] T008 [P] Create `packages/schemas/src/pagination.ts`: `paginationQuerySchema` (`page`≥1 default 1, `pageSize` 1..500) and a `paginated(itemSchema)` envelope helper (`{ items, total, page, pageSize }`); export from `index.ts`.
- [X] T009 [P] Extend `packages/schemas/src/restaurant.ts`: add `onboardingStatus` to `restaurantSchema`; add `updateRestaurantSchema`, `restaurantStatusSchema`, `onboardingStatusSchema`.
- [X] T010 [P] Create `packages/schemas/src/floor.ts` (`floorSchema`, `createFloorSchema`, `updateFloorSchema`) and `packages/schemas/src/area.ts` (`areaSchema`, `createAreaSchema`, `updateAreaSchema`); export from `index.ts`.
- [X] T011 [P] Create `packages/schemas/src/table.ts` (`tableSchema` with `areaId`/`positionX`/`positionY`, `createTableSchema`, `updateTableSchema` incl. `areaId`/position, `createTablesBulkSchema`, `floorLayoutSchema`); export from `index.ts`.

**Checkpoint**: Schema migrated, shared contract + pagination envelope in place — user stories can begin.

---

## Phase 3: User Story 1 - Admin registers a new restaurant (Priority: P1) 🎯 MVP

**Goal**: The admin creates a restaurant that lands `inactive` + `IN_PROGRESS` with a unique slug and an auto-created default floor + area, visible in a paginated admin list.

**Independent Test**: In the admin app, create "Köşe Lokantası" → appears `inactive` with a derived slug; duplicate slug → `SLUG_TAKEN`; a default floor/area exist behind the scenes.

### Tests for User Story 1 ⚠️

- [X] T012 [P] [US1] Unit spec `apps/api/src/restaurants/restaurants.service.spec.ts`: `create()` yields `status: INACTIVE` + `onboardingStatus: IN_PROGRESS` **and provisions a default floor + area in one transaction**; slug derivation; `SLUG_TAKEN` on P2002.
- [X] T013 [P] [US1] e2e `apps/api/test/restaurants.e2e-spec.ts`: `POST /restaurants` → 201 inactive (+ default floor/area queryable); duplicate slug → `SLUG_TAKEN`; `GET /restaurants` returns a `paginated(restaurantSchema)` envelope.

### Implementation for User Story 1

- [X] T014 [US1] Update `RestaurantsService.create` in `apps/api/src/restaurants/restaurants.service.ts` to create the restaurant + default floor ("Zemin Kat") + default area ("Genel") in a `$transaction`; relies on the DB default for `INACTIVE`; returns `onboardingStatus`.
- [X] T015 [US1] Paginate `RestaurantsService.findAll` + controller `GET /restaurants` in `apps/api/src/restaurants/` to accept `paginationQuerySchema` (pageSize 20) and return the `paginated()` envelope.
- [X] T016 [P] [US1] Update the optimistic create in `apps/admin/features/restaurants/use-create-restaurant.ts` to seed `status: "INACTIVE"` + `onboardingStatus: "IN_PROGRESS"`.
- [X] T017 [US1] Update `apps/admin/features/restaurants/{api.ts,queries.ts}` for the paginated list (page param + envelope) and render a status badge + a `Pager` (shown only when `total > pageSize`) in `apps/admin/features/restaurants/components/`.

**Checkpoint**: Admin registers restaurants (inactive, with defaults) in a paginated list — independently demoable.

---

## Phase 4: User Story 2 - Staff complete guided setup (floors, areas, tables) and decide when to go live (Priority: P1)

**Goal**: Staff define floors/areas (defaults pre-filled), add tables (incl. quick add-N) assigned to an area, can't go live without a table, go live explicitly, and skip only via a warned confirmation; progress persists; non-empty floors/areas can't be deleted.

**Independent Test**: Open a new restaurant → wizard; add a floor/area (duplicate names rejected); add tables (duplicate label → `TABLE_LABEL_TAKEN`); "Go live" disabled at 0 tables (`GO_LIVE_REQUIRES_TABLE` server-side), enabled at ≥1 → `ACTIVE`; re-entry shows management; skip is confirmed not instant; deleting a non-empty floor/area → `FLOOR_NOT_EMPTY`/`AREA_NOT_EMPTY`.

### Tests for User Story 2 ⚠️

- [X] T018 [P] [US2] Unit spec `apps/api/src/floors/floors.service.spec.ts`: create rejects duplicate floor name (`FLOOR_NAME_TAKEN`); delete of a floor with areas → `FLOOR_NOT_EMPTY`; `FLOOR_NOT_FOUND`.
- [X] T019 [P] [US2] Unit spec `apps/api/src/areas/areas.service.spec.ts`: create rejects duplicate area name within a floor (`AREA_NAME_TAKEN`), allows same name on another floor; delete of an area with tables → `AREA_NOT_EMPTY`; `AREA_NOT_FOUND`.
- [X] T020 [P] [US2] Unit spec `apps/api/src/tables/tables.service.spec.ts`: create rejects duplicate label **per restaurant** (`TABLE_LABEL_TAKEN`); bulk-add produces sequential labels into an area and errors on collision atomically; `AREA_NOT_FOUND`.
- [X] T021 [P] [US2] Extend `apps/api/src/restaurants/restaurants.service.spec.ts`: go-live with 0 tables → `GO_LIVE_REQUIRES_TABLE`; `INACTIVE→ACTIVE` with ≥1 table succeeds; onboarding `IN_PROGRESS→COMPLETED|SKIPPED`; finishing/skipping does not auto-activate.
- [X] T022 [P] [US2] e2e `apps/api/test/{floors,areas,tables}.e2e-spec.ts` + extend restaurants e2e: floor/area/table create/list (paginated), bulk, `PATCH /restaurants/:id/status` (incl. `GO_LIVE_REQUIRES_TABLE` 409), `PATCH /restaurants/:id/onboarding`, non-empty delete guards.

### Implementation for User Story 2

- [X] T023 [P] [US2] Scaffold + implement the floors module: `pnpm --filter api exec nest generate module floors` (+ service, controller) → `apps/api/src/floors/`. `FloorsService`: create (`FLOOR_NAME_TAKEN` P2002 guard), update, remove (block when areas exist → `FLOOR_NOT_EMPTY`), `findAllBySlug` (paginated). Controller: `GET /restaurants/:slug/floors`, `POST /restaurants/:id/floors`, `PATCH /floors/:id`, `DELETE /floors/:id`. Register in `app.module.ts`.
- [X] T024 [P] [US2] Scaffold + implement the areas module → `apps/api/src/areas/`. `AreasService`: create under floor (`AREA_NAME_TAKEN`, `FLOOR_NOT_FOUND`), update, remove (block when tables exist → `AREA_NOT_EMPTY`), `findAllBySlug` (paginated, optional `?floorId`). Controller: `GET /restaurants/:slug/areas`, `POST /floors/:id/areas`, `PATCH /areas/:id`, `DELETE /areas/:id`.
- [X] T025 [US2] Scaffold + implement the tables module → `apps/api/src/tables/`. `TablesService`: create under area (per-restaurant label uniqueness via `area→floor` lookup → `TABLE_LABEL_TAKEN`; `AREA_NOT_FOUND`), `bulkCreate` in a `$transaction`, `findAllBySlug` (paginated, pageSize 200). Controller: `GET /restaurants/:slug/tables`, `POST /areas/:id/tables`, `POST /areas/:id/tables/bulk`.
- [X] T026 [US2] Add `setStatus` + `setOnboarding` to `apps/api/src/restaurants/restaurants.service.ts` (`→ ACTIVE` enforces ≥1 table else `GO_LIVE_REQUIRES_TABLE`; terminal onboarding never auto-activates) and the `PATCH /restaurants/:id/status` + `PATCH /restaurants/:id/onboarding` routes in the controller.
- [X] T027 [P] [US2] Dashboard feature folders `apps/dashboard/features/{restaurants,floors,areas,tables}/`: `api.ts` (over `apiFetch`, paginated reads), `queries.ts` (by-slug options, keys include page), and `use-*.ts` mutation hooks (create/update/delete floors & areas, create/bulk tables, set-status, set-onboarding) with optimistic + rollback.
- [X] T028 [US2] Repurpose `apps/dashboard/app/s/[slug]/page.tsx`: server-prefetch restaurant + floors + areas + tables via `getQueryClient()`, dehydrate, and branch — wizard when `onboardingStatus === "IN_PROGRESS"`, else management view.
- [X] T029 [US2] Build `SetupWizard` + `FloorsAreasStep` + `TablesStep` in `apps/dashboard/features/*/components/`: step progress/back-forward, floor/area add-rename-remove (with `*_NOT_EMPTY` confirmations), add-table (area select defaulting to sole area) + quick "add N tables", inline validation, ≥44px / ≥16px targets.
- [X] T030 [US2] Build the go-live + skip controls in `apps/dashboard/features/restaurants/components/`: "Go live" disabled at 0 tables with guidance (FR-017); deliberate skip with warning/confirmation (never instant) offering "Go live now?" defaulting to **No** when ≥1 table (FR-015/FR-018/FR-036).

**Checkpoint**: A restaurant can be structured (floors/areas/tables) and taken live end-to-end.

---

## Phase 5: User Story 3 - Staff download and print table QR codes (Priority: P2)

**Goal**: Each table yields a downloadable QR encoding the stable per-table URL; download one or print all in ≤2 interactions; renames/moves never change the code.

**Independent Test**: Download one table's QR file; "print all" (each code labeled); rename/move a table and confirm the encoded URL is unchanged (uses `tableId`).

### Implementation for User Story 3

- [X] T031 [P] [US3] QR URL helper in `apps/dashboard/features/tables/qr.ts`: build the **customer** storefront URL `https://<slug>.<NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN>/t/<tableId>` from the stable `tableId` (FR-021/FR-022/FR-045) — targets the customer app, not the dashboard.
- [X] T032 [US3] `QrSheet` component in `apps/dashboard/features/tables/components/qr-sheet.tsx`: render a single table's QR via `<QRCodeCanvas>` from `qrcode.react`, then `canvas.toDataURL("image/png")` → anchor download (FR-023).
- [X] T033 [US3] Print-all view + `@media print` stylesheet rendering one `<QRCodeSVG>` (`qrcode.react`, vector for crisp print) per table paired with its label in `apps/dashboard/app/s/[slug]/` (one action, ≤2 interactions — FR-024/FR-025/SC-003), usable at 150+ tables.
- [X] T034 [US3] Wire single-download and print-all entry points into the wizard's `TablesStep` and the management view.

**Checkpoint**: Staff walk away with printable, label-paired QR codes.

---

## Phase 6: User Story 4 - Customer scans a table QR and sees the menu (Priority: P2)

**Goal**: On the mobile-first customer app (subdomain), a valid table on a live restaurant shows the placeholder menu; otherwise "not available"; the root shows the "scan your table's QR" landing.

**Independent Test**: Live restaurant → `<slug>.localhost:3002/t/<tableId>` shows placeholder menu; deactivate → "not available yet"; root → scan landing; unknown slug/table → clear not-found.

### Tests for User Story 4 ⚠️

- [X] T035 [P] [US4] Extend `apps/api/test/tables.e2e-spec.ts`: `GET /restaurants/:slug/tables/:tableId` → 200 `tableSchema`; unknown table → `TABLE_NOT_FOUND`; unknown slug → `RESTAURANT_NOT_FOUND`.

### Implementation for User Story 4

- [X] T036 [US4] Add `GET /restaurants/:slug/tables/:tableId` to `apps/api/src/tables/tables.controller.ts` + `findOneBySlug` in `tables.service.ts` (`TABLE_NOT_FOUND`) — backs the customer validity gate.
- [X] T037 [P] [US4] Create `apps/customer/proxy.ts` by copying the dashboard subdomain pattern (extract subdomain → rewrite `/` to `/s/<slug>`, block apex `/s/` access).
- [X] T038 [P] [US4] Add `apps/customer/app/providers.tsx` with `QueryProvider` (from `@repo/query`) and a `ZodInit` setting `z.config(z.locales.tr())`; render it in the customer layout.
- [X] T039 [US4] `apps/customer/features/restaurants/`: `api.ts` `fetchRestaurantBySlug` (404 → `null`) + `queries.ts`.
- [X] T040 [US4] `apps/customer/features/tables/`: `api.ts` `fetchTable(slug, tableId)` (404 → `null`) + `queries.ts`.
- [X] T041 [US4] `apps/customer/app/s/[slug]/page.tsx`: branded "scan the QR on your table" landing when `ACTIVE`, "not available yet" when inactive/unknown (FR-030).
- [X] T042 [US4] `apps/customer/app/s/[slug]/t/[tableId]/page.tsx`: placeholder menu **only if** `status === "ACTIVE"` **and** the table resolves; else "not available yet" (FR-028/FR-029/SC-007), mobile-first.

**Checkpoint**: A scanned code does something sensible end-to-end; non-live restaurants never leak a menu.

---

## Phase 7: User Story 7 - Staff arrange tables on the visual floor-plan canvas (Priority: P2)

**Goal**: Per-floor canvas where staff drag tables into positions (keyboard-accessible); positions persist; un-arranged floors show a default equal layout; never required to go live; QR unaffected by position.

**Independent Test**: Open a floor's canvas → default layout for an un-arranged floor; drag a table, reload → position persists; reposition via keyboard; moving a table doesn't change its QR; setup/go-live possible without arranging.

### Tests for User Story 7 ⚠️

- [X] T043 [P] [US7] Extend `apps/api/src/tables/tables.service.spec.ts` + e2e: `PUT /floors/:id/layout` saves normalized positions for the floor's tables (`floorLayoutSchema`), rejects unknown `tableId` (`TABLE_NOT_FOUND`) and unknown floor (`FLOOR_NOT_FOUND`).

### Implementation for User Story 7

- [X] T044 [US7] Add `saveLayout` to `apps/api/src/floors/floors.service.ts` (batch-update `positionX/Y` for the floor's tables in a `$transaction`) and `PUT /floors/:id/layout` to `apps/api/src/floors/floors.controller.ts` (`ZodValidationPipe(floorLayoutSchema)`); also allow single-table `positionX/Y` in `PATCH /tables/:id`.
- [X] T045 [P] [US7] Dashboard `apps/dashboard/features/floors/api.ts` `saveFloorLayout(floorId, positions)` + `use-save-floor-layout.ts` (optimistic).
- [X] T046 [US7] Build `FloorPlanCanvas` in `apps/dashboard/features/floors/components/floor-plan-canvas.tsx` using `@dnd-kit`: absolutely-positioned, focusable table nodes grouped by area; pointer + keyboard drag with ARIA announcements; default grid layout for `null` positions; save normalized coords on drop. Add the canvas route/tab under `apps/dashboard/app/s/[slug]/`.
- [X] T047 [US7] Provide a non-canvas list fallback for all table actions and ensure the canvas surface meets the ≥44px / focus-visible / keyboard requirements (FR-035/FR-043/FR-044/FR-045).

**Checkpoint**: Staff can arrange floors visually and accessibly; positions persist; QR unaffected.

---

## Phase 8: User Story 5 - Staff make rare edits and manage go-live after setup (Priority: P3)

**Goal**: From a simple management view, staff add/rename/remove tables, adjust floors/areas, re-download QRs, and toggle live/not-live — without the wizard.

**Independent Test**: Add/rename/remove tables and adjust floors/areas from management (warned removals); toggle off/on; removed table's URL stops resolving; remaining codes still print.

### Tests for User Story 5 ⚠️

- [X] T048 [P] [US5] Extend `apps/api/src/tables/tables.service.spec.ts`: `update` label conflict → `TABLE_LABEL_TAKEN`, area reassignment, `update`/`delete` of missing table → `TABLE_NOT_FOUND`.
- [X] T049 [P] [US5] Extend `apps/api/test/tables.e2e-spec.ts`: `PATCH /tables/:id` (rename/move/reassign) and `DELETE /tables/:id` (204).

### Implementation for User Story 5

- [X] T050 [US5] Add `update` (rename, capacity, `areaId` reassignment) + `remove` to `apps/api/src/tables/tables.service.ts` and `PATCH /tables/:id` + `DELETE /tables/:id` to `apps/api/src/tables/tables.controller.ts`.
- [X] T051 [P] [US5] Dashboard `use-update-table.ts` + `use-delete-table.ts` (and floor/area update/delete hooks if not already added in T027) in `apps/dashboard/features/{tables,floors,areas}/`.
- [X] T052 [US5] `TableManager` management view in `apps/dashboard/features/tables/components/table-manager.tsx`: all tables at once (no small cap), grouped by floor/area, warned destructive confirmations (FR-026/FR-031/FR-036), per-row QR download, post-setup add yields immediate QR (FR-032), live/not-live toggle reusing `use-set-status` (FR-020).

**Checkpoint**: Full staff lifecycle (edit floors/areas/tables + toggle) without the wizard.

---

## Phase 9: User Story 6 - Admin edits, deactivates, removes & manages a restaurant (Priority: P3)

**Goal**: Admin corrects name/slug (warned slug change on live), deactivates/reactivates, removes (cascade confirmation), and manages a restaurant's floors/areas/tables in a plain UI over the same contract.

**Independent Test**: Edit name/slug; live slug change warns about breaking links; deactivate → scans show "not available"; delete with tables → consequence confirmation, cascade; manage floors/areas/tables from admin with the same rules (no wizard, no canvas).

### Tests for User Story 6 ⚠️

- [X] T053 [P] [US6] Extend `apps/api/src/restaurants/restaurants.service.spec.ts`: `update` slug conflict → `SLUG_TAKEN`, missing → `RESTAURANT_NOT_FOUND`; `remove` cascades floors→areas→tables.
- [X] T054 [P] [US6] Extend `apps/api/test/restaurants.e2e-spec.ts`: `PATCH /restaurants/:id` and `DELETE /restaurants/:id` (204, cascade).

### Implementation for User Story 6

- [X] T055 [US6] Add `update` + `remove` to `apps/api/src/restaurants/restaurants.service.ts` (uniqueness re-check → `SLUG_TAKEN`; `RESTAURANT_NOT_FOUND`; cascade delete) and `PATCH /restaurants/:id` + `DELETE /restaurants/:id` to the controller.
- [X] T056 [P] [US6] Admin `apps/admin/features/restaurants/`: extend `api.ts` with `updateRestaurant`/`deleteRestaurant`/`setRestaurantStatus`; add `use-update-restaurant.ts` + `use-delete-restaurant.ts`.
- [X] T057 [P] [US6] Admin plain management feature folders `apps/admin/features/{floors,areas,tables}/` (`api.ts`/`queries.ts`/`use-*.ts`) calling the **same** endpoints as the dashboard.
- [X] T058 [US6] Admin management UI in `apps/admin/features/*/components/`: edit dialog, slug-change-on-live warning (FR-008), deactivate/reactivate, delete confirmation stating consequences (FR-007), and plain floor/area/table management (no wizard, no canvas — FR-048/FR-050) reusing the shared validation/confirmation rules.

**Checkpoint**: All seven stories independently functional.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T059 [P] Run the [quickstart.md](./quickstart.md) scenarios A–G manually and confirm expected outcomes.
- [ ] T060 Manual WCAG 2.2 AA pass on the dashboard incl. the canvas: keyboard-only operation (drag via keyboard), visible focus, AA contrast, targets ≥44px, base text ≥16px, no time-limited steps, plain Turkish labels (FR-035/SC-009/SC-012).
- [ ] T061 Verify pagination behavior across surfaces: pager hidden on a single page, appears past the per-surface size, tables un-capped at normal volumes (SC-013/SC-014/SC-015).
- [ ] T062 `pnpm lint && pnpm typecheck` clean across all workspaces; `pnpm --filter api test && pnpm --filter api test:e2e` green.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: T004 depends on T003; T005 depends on T004; T006–T011 (schemas/i18n) are independent of the T003→T005 chain. **Blocks all user stories.**
- **User Stories (Phases 3–9)**: all depend on Foundational. Then:
  - US1 (P1) and US2 (P1) are the MVP core; US1's default-floor/area work (T014) is reused by US2.
  - US3 (P2) depends on US2 (tables exist).
  - US4 (P2) depends on US2 + one read endpoint (T036).
  - US7 (P2, canvas) depends on US2 (floors/areas/tables exist).
  - US5 (P3) depends on US2 (extends the tables/floors/areas surface).
  - US6 (P3) depends on Foundational + US1 (admin surface) and reuses US2's endpoints for management.
- **Polish (Phase 10)**: after the desired stories are complete.

### Within Each User Story

- Backend tests (specs/e2e) written to fail first, then implementation makes them pass.
- Shared schema/contract (Phase 2) before services; API service before controller.
- Frontend `api.ts` → `queries.ts` → `use-*` hooks → components/pages.

### Parallel Opportunities

- Phase 1: T001 ∥ T002.
- Phase 2: T006 ∥ T007 ∥ T008 ∥ T009 ∥ T010 ∥ T011 (different files), independent of the T003→T004→T005 chain.
- The three new API modules are independent: T023 (floors) ∥ T024 (areas) ∥ T025 (tables) once T005 lands.
- Per-story test tasks marked `[P]` (e.g., T018/T019/T020/T021) touch different files and run together.
- Once Foundational is done, US1, US2, and US6 can be staffed in parallel; US3/US7/US5 follow US2.

---

## Parallel Example: User Story 2

```bash
# Backend service specs (write first, expect fail):
Task: "apps/api/src/floors/floors.service.spec.ts"        # T018
Task: "apps/api/src/areas/areas.service.spec.ts"          # T019
Task: "apps/api/src/tables/tables.service.spec.ts"        # T020
Task: "extend apps/api/src/restaurants/restaurants.service.spec.ts"  # T021

# Independent API modules:
Task: "floors module apps/api/src/floors/"                # T023
Task: "areas module apps/api/src/areas/"                  # T024
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Phase 1 Setup → Phase 2 Foundational (CRITICAL).
2. Phase 3 (US1) — admin registers inactive restaurants with defaults.
3. Phase 4 (US2) — staff structure floors/areas/tables and go live.
4. **STOP and VALIDATE**: a restaurant can be registered, structured, and taken live end-to-end.

### Incremental Delivery

1. Foundation ready.
2. + US1 → admin registration (demo).
3. + US2 → guided setup + go-live (MVP!).
4. + US3 → printable QR codes.
5. + US4 → customer scan → placeholder menu.
6. + US7 → visual floor-plan canvas.
7. + US5 → rare staff edits + live toggle.
8. + US6 → admin maintenance + plain management.

Each increment is independently testable and adds value without breaking the previous one.

---

## Notes

- `[P]` = different files, no incomplete-task dependency.
- `[Story]` maps each task to a spec user story for traceability (US7 = visual canvas).
- Commit after each phase per the project's phased-commit workflow (SpecKit spec/plan/tasks artifacts are committed once together; implementation commits are phased).
- Backend reuses the existing `SLUG_TAKEN`/P2002-guard idiom for `*_NAME_TAKEN`/`TABLE_LABEL_TAKEN`; non-empty removal is a service guard, not a DB constraint.
- Compose `@repo/ui` primitives; the canvas uses accessible DOM-based `@dnd-kit` (not a `<canvas>` lib). Catalog-pin all new deps.
