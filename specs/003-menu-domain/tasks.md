---
description: "Task list for Menu Domain (feature 003)"
---

# Tasks: Menu Domain

**Input**: Design documents from `specs/003-menu-domain/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md)

**Tests**: Included where the **constitution (Principle IV)** mandates them — backend service logic, the shared contract, and the `@repo/core` pure helpers (which carry SC-003/SC-004). Presentational UI carries no blanket test obligation.

**Organization**: Grouped by user story (P1→P6) so each is an independently testable increment. The customer **visual** menu (US6) is deferred to the incoming design (research §12); its backend + payload are completed and tested in this slice.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependency on an incomplete task)
- **[Story]**: US1–US6 (setup/foundational/polish carry no story label)

## Path Conventions

Turborepo monorepo (per plan.md): `packages/{db,core,schemas,i18n}/`, `apps/{api,dashboard,customer}/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies and dev infra needed before any story.

- [ ] T001 [P] Add `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` to the `catalog:` in `pnpm-workspace.yaml` and reference them (`catalog:`) in `apps/api/package.json` (via `pnpm add` — never hand-edit), then `pnpm install`
- [ ] T002 [P] Add a **MinIO** service + bucket-init to `docker-compose.yml` (beside Postgres) and add `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `MEDIA_PUBLIC_BASE_URL` to `apps/api/.env.example` (+ local `.env`)
- [ ] T003 [P] Add a unit-test runner to `@repo/core` (Jest config + `test` script in `packages/core/package.json`) for the pure-helper specs

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, delegates, error contract, and shared core constants every story builds on.

**⚠️ CRITICAL**: No user-story work begins until this phase completes.

- [ ] T004 Add `ServingUnit`/`DayOfWeek`/`MediaType` enums + the 8 models (`Category, MenuItem, Allergen, Tag, OptionGroup, Option, AvailabilityWindow, MediaAsset`) and the item↔allergen / item↔tag implicit m2m to `packages/db/prisma/schema.prisma` (per [data-model.md](./data-model.md))
- [ ] T005 Generate client + create the migration: `pnpm --filter @repo/db db:generate` then `db:migrate` (depends T004)
- [ ] T006 Add the 8 model delegates to `apps/api/src/prisma/prisma.service.ts` (depends T005)
- [ ] T007 [P] Add the new `ErrorCode`s (CATEGORY_*/MENU_ITEM_*/ALLERGEN_*/TAG_*/OPTION_*/AVAILABILITY_*/MEDIA_*) to `packages/schemas/src/errors.ts` (research §10)
- [ ] T008 [P] Add Turkish messages for each new code to `packages/i18n/src/error-messages.ts`
- [ ] T009 [P] Add the shared `reorderSchema {ids: string[]}` to `packages/schemas/src/common.ts` and export from `index.ts`
- [ ] T010 [P] Add the `STANDARD_ALLERGENS` (Turkish EU-14) constant to `packages/core/src/allergens.ts` and export from `index.ts` (research §8)
- [ ] T011 [P] Add media limits (per-item cap, allowed types, max sizes) to `packages/core/src/media-limits.ts` and export from `index.ts` (research §2)

**Checkpoint**: Schema + contract scaffolding ready — stories can begin.

---

## Phase 3: User Story 1 — Build the menu: categories & priced items (Priority: P1) 🎯 MVP

**Goal**: Staff create/reorder/hide categories and create/reorder/in-stock-toggle priced items in the dashboard.

**Independent Test**: Create a category, add a flat-price item, reorder, hide a category, toggle out-of-stock, and confirm a non-empty category cannot be deleted.

### Tests (constitution-mandated)

- [ ] T012 [P] [US1] `apps/api/src/categories/categories.service.spec.ts` — create, name-uniqueness, not-empty delete guard, reorder
- [ ] T013 [P] [US1] `apps/api/src/menu-items/menu-items.service.spec.ts` — create, in-stock toggle, reorder within category
- [ ] T014 [P] [US1] `apps/api/test/menu-categories.e2e-spec.ts` — category + item CRUD contract

### Implementation

- [ ] T015 [P] [US1] Category schemas in `packages/schemas/src/category.ts` (create/update/response) + export
- [ ] T016 [P] [US1] Base menu-item schemas in `packages/schemas/src/menu-item.ts` (create/update/response — name, priceMinor, inStock) + export
- [ ] T017 [US1] `categories` module (`controller`/`service`/`module`) in `apps/api/src/categories/` — CRUD + `PUT order` + not-empty guard, mirroring `restaurants/` (depends T015, T006)
- [ ] T018 [US1] `menu-items` module in `apps/api/src/menu-items/` — base CRUD + `PUT order` (sub-resources land in later stories) (depends T016, T006)
- [ ] T019 [P] [US1] Dashboard `features/categories/` (`api.ts`, `queries.ts`, `use-*.ts`) over `apiFetch`
- [ ] T020 [P] [US1] Dashboard `features/menu-items/` (`api.ts`, `queries.ts`, `use-*.ts`)
- [ ] T021 [US1] Dashboard menu-management route `apps/dashboard/app/s/[slug]/menu/` — category + item lists with `@dnd-kit` reorder, create/edit (name/price/inStock), hide toggle, and a client-side search scaffold (depends T019, T020)

**Checkpoint**: A priced, ordered, hideable menu exists and is managed in the dashboard — MVP.

---

## Phase 4: User Story 2 — Item options: variants, extras, add/remove ingredients (Priority: P2)

**Goal**: Staff define option groups; effective price computes from selections.

**Independent Test**: A required size group + an optional extras group with default-on removable options; verify computed price = base + Σ selected deltas and required-group enforcement.

### Tests

- [ ] T022 [P] [US2] `packages/core/src/options.spec.ts` — `effectivePriceMinor` + `validateConfiguration` (required-empty, over/under min-max, unavailable/unknown option, default config)
- [ ] T025 [P] [US2] `apps/api/src/menu-items/option-groups.service.spec.ts` — group invariants, CRUD, reorder

### Implementation

- [ ] T023 [US2] `packages/core/src/options.ts` — pure `effectivePriceMinor`, `validateConfiguration`, `defaultConfiguration` + export (depends T003)
- [ ] T024 [P] [US2] Option-group/option schemas in `packages/schemas/src/option.ts` + export
- [ ] T026 [US2] Option-group + option endpoints/service in the `menu-items` module (CRUD + reorder, `INVALID_OPTION_CONFIG` on invariant violations) (depends T024, T023, T018)
- [ ] T027 [US2] Dashboard option-group editor in the item editor (variant/extras/ingredient groups, `defaultSelected`, live effective price via `@repo/core`) (depends T021, T023)

**Checkpoint**: Items support size variants, paid extras, and add/remove ingredients with correct pricing.

---

## Phase 5: User Story 3 — Descriptive & dietary information (Priority: P3)

**Goal**: Description, calories, serving amount/unit (→ unit price), allergens (seeded + custom), tags; allergens/tags searchable.

**Independent Test**: ₺120 item with 500 g → ₺240/kg; seeded allergen set present on new restaurant; add custom "Domates"; tag "vegan".

### Tests

- [ ] T028 [P] [US3] `packages/core/src/unit-price.spec.ts` — per kg/L/piece normalization, zero/empty amount → null
- [ ] T031 [P] [US3] `apps/api/src/allergens/allergens.service.spec.ts` + `apps/api/src/tags/tags.service.spec.ts` — uniqueness, standard-protected deletion, and deleting a custom allergen/tag detaches it from items without corrupting them
- [ ] T035a [P] [US3] Extend `apps/api/src/restaurants/restaurants.service.spec.ts` — standard allergens seeded on create

### Implementation

- [ ] T029 [US3] `packages/core/src/unit-price.ts` — normalized display unit price + export
- [ ] T030 [P] [US3] Allergen + tag schemas (`packages/schemas/src/allergen.ts`, `tag.ts`) and extend `menu-item.ts` (description, calories, servingAmount/Unit, allergenIds, tagIds) + exports
- [ ] T032 [US3] `allergens` module in `apps/api/src/allergens/` — CRUD + standard-protected guard (depends T030, T006)
- [ ] T033 [US3] `tags` module in `apps/api/src/tags/` — CRUD (depends T030, T006)
- [ ] T034 [US3] Extend `menu-items` service to persist serving fields and allergen/tag assignment (set semantics) on create/update (depends T032, T033, T018)
- [ ] T035 [US3] Seed `STANDARD_ALLERGENS` inside the `restaurants.service` create transaction (depends T010, T006)
- [ ] T036 [US3] Idempotent backfill of standard allergens for pre-existing restaurants (migration/one-off script) (depends T010, T005)
- [ ] T037 [P] [US3] Dashboard `features/allergens/` + `features/tags/` (api/queries/use-*)
- [ ] T038 [US3] Dashboard item editor: description/calories/serving fields + allergen & tag pickers + unit-price display; allergen/tag management UI (depends T037, T029, T021)

**Checkpoint**: Items carry full dietary/descriptive info; every new restaurant has the standard allergen set.

---

## Phase 6: User Story 4 — Time-limited availability (Priority: P4)

**Goal**: Per-item availability windows; "orderable now?" combines stock + windows in Europe/Istanbul.

**Independent Test**: Mon & Fri 15:00–16:00 orderable only then; 22:00–02:00 orderable at 01:00; out-of-stock never; no windows always.

### Tests

- [ ] T039 [P] [US4] `packages/core/src/availability.spec.ts` — multi-day, midnight-crossing, out-of-stock, no-windows
- [ ] T042 [P] [US4] `apps/api/src/menu-items/availability.service.spec.ts` — replace semantics, window invariants

### Implementation

- [ ] T040 [US4] `packages/core/src/availability.ts` — pure `isOrderableNow(item, nowLocal)` + an edge helper to derive `{day, minutes}` for `Europe/Istanbul` via `Intl` + export (depends T003)
- [ ] T041 [P] [US4] Availability schema in `packages/schemas/src/availability.ts` (replace-all `{windows}`) + export
- [ ] T043 [US4] Availability `PUT` endpoint + service in the `menu-items` module (full replace, `AVAILABILITY_WINDOW_INVALID`) (depends T041, T040, T018)
- [ ] T044 [US4] Dashboard availability-window editor in the item editor (day-set + time ranges) (depends T021, T041)

**Checkpoint**: Items can be time-restricted; orderability is correct across edge cases.

---

## Phase 7: User Story 5 — Item media: photos & videos (Priority: P5)

**Goal**: Direct-to-storage presigned upload of an ordered, capped media set; first photo = cover; no orphans.

**Independent Test**: Upload 2 photos + 1 mp4, reorder cover; reject over-size/wrong-type/6th; no dangling media after a cancelled upload.

### Tests

- [ ] T045 [P] [US5] `apps/api/src/storage/s3.service.spec.ts` — presign + HEAD verify + delete (S3 client mocked)
- [ ] T048 [P] [US5] `apps/api/src/menu-items/media.service.spec.ts` — cap, type/size, confirm-HEAD, no-orphan-on-failure

### Implementation

- [ ] T046 [US5] `storage` module + `S3Service` in `apps/api/src/storage/` — presign PUT, HEAD verify, delete, compose public URL (env-selected MinIO/R2, one code path) (depends T001, T011)
- [ ] T047 [P] [US5] Media schemas in `packages/schemas/src/media.ts` (request-upload, confirm, response) + export
- [ ] T049 [US5] Media endpoints (`upload-url`/`confirm`/`delete`/`order`) + service in the `menu-items` module — limits at grant, HEAD-verify on confirm (depends T046, T047, T018)
- [ ] T050 [US5] Dashboard media uploader in the item editor — presigned `PUT` from browser, client pre-check, reorder/cover, rejection messages (depends T021, T047)

**Checkpoint**: Items carry photos/videos via direct upload, with limits enforced and no orphans.

---

## Phase 8: User Story 6 — Diner browses the menu by QR (Priority: P6) — backend now, UI deferred

**Goal**: Public `MenuTree` (active restaurants only) with per-item `orderableNow`; client-side search. **Visual UI deferred to the incoming design.**

**Independent Test**: `GET /api/menu/by-slug/:slug` returns the visible tree for an active restaurant (hidden category absent); 404 for non-active; in-memory search matches name/description/tag/category.

### Tests

- [ ] T051 [P] [US6] `apps/api/src/menu/menu.service.spec.ts` — active gating, tree shape, `orderableNow` per item
- [ ] T053 [P] [US6] `apps/api/test/public-menu.e2e-spec.ts` — by-slug active vs non-active, hidden category excluded

### Implementation

- [ ] T052 [P] [US6] `MenuTree` schema in `packages/schemas/src/menu.ts` + export
- [ ] T054 [US6] `menu` module in `apps/api/src/menu/` — public `GET by-slug`, active-gated, computes `orderableNow` (Europe/Istanbul) per item; composes media public URLs (depends T052, T040, T018, T026, T032, T033, T043, T049)
- [ ] T055 [US6] Customer `features/menu/` `api.ts` + `queries.ts` — fetch `MenuTree` by slug (depends T052)
- [ ] T056 [P] [US6] Customer in-memory search util (item name/description/tags + category names, Turkish-normalized) + unit test (depends T055)
- [ ] T057 [US6] ⏸️ **DEFERRED — blocked on the design handoff.** Customer mobile menu UI: warm theme, sticky scroll-spy categories, balanced-photo item cards, item-detail **bottom sheet** (media gallery, price + unit price, calories, allergens, tags, options shown informatively, availability states). **Adapt the provided design (see Notes), NOT 1:1, using shadcn + Tailwind (no raw HTML/CSS), and NO placeholder company name.** (depends T055, T056, design)

**Checkpoint**: The public menu endpoint + payload are complete and tested; the customer UI is a later presentation layer.

---

## Phase 9: Polish & Cross-Cutting

- [ ] T058 [P] `pnpm lint` + `pnpm typecheck` clean across touched workspaces
- [ ] T059 [P] Finalize `.env.example` (api) + document MinIO (dev) / R2 (prod) setup in `quickstart.md`/README
- [ ] T060 Run `quickstart.md` validation scenarios (verify SC-001…SC-007). Note: SC-002's render-<2s and search-<200ms budgets are **manually observed** here (no automated perf assertion this slice); all other SCs are covered by automated tests
- [ ] T061 [P] Document a bucket lifecycle rule to expire unconfirmed uploads (ops note; research §1)

---

## Dependencies & Execution Order

- **Setup (P1)** → **Foundational (P2)** blocks everything.
- **US1 (P1)** is the MVP. **US2–US5** each depend only on Foundational + the `menu-items` module (T018); they are otherwise independent and can be built in any order / parallel.
- **US6 (T054)** integrates the read side and therefore depends on the option/allergen/tag/availability/media services existing (T026, T032, T033, T043, T049) so the tree includes them; the customer UI (T057) additionally waits on the **design**.
- Within a story: `@repo/core` helper → schemas → API service → API controller → dashboard feature → dashboard UI.

## Parallel Opportunities

- **Setup**: T001, T002, T003 in parallel.
- **Foundational**: T007–T011 in parallel (after T006).
- **Per story**: the `[P]` test + schema tasks run together; e.g. US3 — T028, T030, T031, T035a in parallel before their services.
- With multiple developers, US2–US5 can be staffed concurrently once Foundational is done.

## Parallel Example: User Story 1

```bash
# Tests + schemas together:
Task: "categories.service.spec.ts"     # T012
Task: "menu-items.service.spec.ts"     # T013
Task: "menu-categories.e2e-spec.ts"    # T014
Task: "category.ts schemas"            # T015
Task: "menu-item.ts schemas"           # T016
```

---

## Implementation Strategy

### MVP First (US1)
1. Phase 1 Setup → Phase 2 Foundational (CRITICAL).
2. Phase 3 (US1) — categories + priced items managed in the dashboard.
3. **STOP & VALIDATE**: a restaurant has a real, ordered, hideable priced menu.

### Incremental Delivery
1. Foundation ready.
2. + US1 → priced menu (MVP).
3. + US2 → options/variants/ingredients (unblocks accurate adisyon ordering later).
4. + US3 → dietary/descriptive info + seeded allergens.
5. + US4 → time-limited items.
6. + US5 → media.
7. + US6 (backend) → public menu endpoint + search; **customer UI lands with the design**.

Each increment is independently testable and adds value without breaking the previous one.

---

## Notes

- **Tests are constitution-mandated** (Principle IV) for services, the contract, and `@repo/core` helpers — not optional here; UI carries no blanket test obligation.
- Follow the repo contract pattern throughout: schema in `@repo/schemas` → `ErrorCode` → structured throw → Turkish in `@repo/i18n`; `apiFetch` on every client call; `apps/api/src/restaurants/` is the module template.
- All money is integer kuruş; pricing/unit-price/orderability/config-validation live in `@repo/core` so the **future adisyon reuses them unchanged**.
- Catalog-pin new deps; never hand-edit `package.json` (use `pnpm add`). Compose `@repo/ui` primitives; reuse `@dnd-kit` for reorder.
- Commit per phase (phased-commit workflow); a single pre-implementation commit of the spec/plan/tasks happens before T001.
- **Customer design** to adapt for T057: a Claude Design handoff the user provides (URL kept out of version control). Adapt freely (not 1:1), **shadcn + Tailwind over raw HTML/CSS**. The design shows a **placeholder company name that must never be written anywhere** (code, copy, or git) — the real name comes later. See [[dashboard-design-direction]].
