# Phase 0 Research: Restaurant Onboarding & Setup

All unknowns from Technical Context resolved below. Each decision is grounded in the existing codebase conventions (see CLAUDE.md), the constitution, and the clarified spec (including the 2026-06-05 clarifications adding the Floor → Area → Table hierarchy, an editable visual floor-plan canvas, defensive pagination, and an admin management surface).

## 1. App responsibilities — staff vs customer (both multi-tenant)

- **Decision**: `dashboard` = **staff only** (desktop-first); `customer` = **customers only** (mobile-first). Both are multi-tenant and resolve a restaurant from `<slug>.<app-domain>` via the same `proxy.ts` subdomain→`/s/[slug]` pattern; they simply render different UIs. Customers never use the dashboard app. The `admin` app is the single-operator panel and additionally hosts a plain restaurant **management** surface (see §11).
  - In `dashboard`, the current `apps/dashboard/app/s/[slug]/page.tsx` "Hoş geldiniz" page is **early scaffolding**, repurposed into the staff wizard/management UI.
  - In `customer`, the storefront is **built fresh**: copy the proven `proxy.ts` pattern, add `/s/[slug]` (landing) + `/s/[slug]/t/[tableId]` (placeholder menu), and add the deps it lacks.
- **Rationale**: The clarified spec is explicit about audience separation. The subdomain mechanism is identical and proven, so reuse beats reinvention.
- **Alternatives considered**: *One app with a role switch* — rejected: no auth yet; conflates mobile customers with desktop staff, contradicting the desktop-first/mobile-first + accessibility goals.

## 2. How is the `dashboard` (staff) bound to a specific restaurant without auth?

- **Decision**: **Subdomain scoping**, mirroring the customer proxy. Staff reach their restaurant at `<slug>.<dashboard-root-domain>`; `proxy.ts` rewrites to `/s/[slug]`.
- **Rationale**: No login to derive the tenant from, and the repo already has a working subdomain mechanism. Forward-compatible: when auth lands, the temporary owner account gates access to that subdomain.
- **Alternatives considered**: *Path param `/[slug]/…`* — diverges from the established convention. *Global picker* — leaks other tenants; needless friction.

## 3. QR code generation — where and how?

- **Decision**: Render QR codes **client-side in the dashboard** using **`qrcode.react`** (catalog-pinned, self-typed — no `@types/*`). Each code encodes the **customer** storefront URL `https://<slug>.<NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN>/t/<tableId>` (the customer app, port 3002 in dev — **not** the dashboard's own domain). Single download uses `<QRCodeCanvas ref>` → `canvas.toDataURL("image/png")` → anchor download; "download/print all" is a print-friendly page (`@media print`) rendering one `<QRCodeSVG>` per table (vector → crisp at any printer DPI) paired with its label.
- **Rationale**: The QR is fully derivable from `(slug, tableId)`; no image bytes in the DB or API. Uses the immutable `tableId`, so renaming a label — or moving the table on the canvas — never changes the code (FR-022/FR-045). `qrcode.react` (v4, React-19-ready) gives a declarative Canvas (easy PNG) and SVG (ideal for the print-all page) from one dependency.
- **QR target domain**: the dashboard must point the code at the **customer** app, a different origin it can't derive from its own request host, so a dedicated `NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN` is added to the dashboard env (+ `.env.example`). (The existing `NEXT_PUBLIC_ROOT_DOMAIN` is the dashboard's *own* apex, needed by `proxy.ts` to locate the subdomain boundary; it can't double as the customer domain.)
- **Alternatives considered**: *`qrcode` (node-qrcode)* — rejected: ~2 years stale (1.5.4), imperative canvas/effect wiring, needs a separate `@types/qrcode`. *Server-generated images/endpoint* — adds storage with no benefit. *Encode slug+label* — breaks on rename.

## 4. Restaurant visibility & onboarding state model

- **Decision**: Reuse `RestaurantStatus { ACTIVE, INACTIVE }` for visibility, **default changed to `INACTIVE`** on creation. Add `OnboardingStatus { IN_PROGRESS, COMPLETED, SKIPPED }` (default `IN_PROGRESS`). "Go live" = `INACTIVE → ACTIVE`, allowed only with ≥1 table; enforced server-side.
- **Rationale**: Visibility (customer-facing) and onboarding (staff UI state) are orthogonal per the clarifications. The customer storefront already keys off `status === "ACTIVE"`.
- **Alternatives considered**: *Single status with more values* — couples UI progress to public visibility. *Derive "show wizard" from "has tables"* — can't represent "skipped with tables".

## 5. "Go live requires a table" + skip semantics

- **Decision**: Enforced in the `api` service: `→ ACTIVE` with zero tables throws `GO_LIVE_REQUIRES_TABLE`. Skipping is a client-side warned confirmation setting `onboardingStatus = SKIPPED` (optionally going live only if staff opt in and ≥1 table exists, default **No**).
- **Rationale**: Server enforcement keeps the invariant true regardless of client; the skip warning is a UX concern (FR-015).

## 6. Table identity, uniqueness, attributes, and placement

- **Decision**: `Table` has a `cuid()` `id` (stable identity for QR), a `label` unique **per restaurant** (`@@unique([restaurantId, label])`), a **required `areaId`** (every table lives in exactly one area → one floor → one restaurant), optional `capacity Int?`, and **optional canvas coordinates** `positionX Float?` / `positionY Float?` (normalized `0..1` on its floor's plan; `null` ⇒ default layout). Label uniqueness surfaces as `TABLE_LABEL_TAKEN` (P2002 guard, mirroring `SLUG_TAKEN`).
- **Rationale**: Satisfies FR-012/FR-018/FR-022/FR-038/FR-045. Label stays unique per **restaurant** (not per area) so staff/waiters never see two "Table 5"; areas are organizational. Normalized coordinates are resolution-independent and keep position purely presentational (never affects QR).
- **Alternatives considered**: *Label unique per area* — rejected: ambiguous physical references. *Pixel coordinates* — rejected: break on different canvas sizes.

## 7. Bulk "add N tables"

- **Decision**: `POST /restaurants/:id/tables/bulk` accepting `count` (+ optional `startNumber` / `labelPrefix` / **`areaId`**) creates N sequentially-labeled tables in one `$transaction`; collisions → `TABLE_LABEL_TAKEN`. Defaults `areaId` to the restaurant's default area when omitted.
- **Rationale**: FR-013 — fast setup, atomic, single round-trip. Zod-validated with a sane max (≤200, the generous table page size — see §10).

## 8. Floors & Areas hierarchy modeling

- **Decision**: Two new models — `Floor` (belongs to `Restaurant`) and `Area` (belongs to `Floor`); `Table.areaId` points to `Area`. Names: `Floor` unique per restaurant (`@@unique([restaurantId, name])`), `Area` unique per floor (`@@unique([floorId, name])`). Both carry an integer `position` for ordering. All FK `onDelete: Cascade` so deleting a restaurant cleanly removes floors→areas→tables; **non-empty removal is blocked at the service layer** (`FLOOR_NOT_EMPTY` / `AREA_NOT_EMPTY`), not by DB `Restrict`. On `RestaurantsService.create`, a `$transaction` also creates a default floor (**"Zemin Kat"**) and default area (**"Genel"**).
- **Rationale**: Directly implements FR-038–FR-041 and the 2026-06-05 clarification. Cascade-at-DB + guard-at-service resolves the classic conflict: admin "delete restaurant" must cascade everything, while staff "delete area/floor" must be blocked when it would orphan children. Auto-defaults keep the single-section venue from ever touching the hierarchy (FR-039).
- **Alternatives considered**:
  - *DB `onDelete: Restrict` for Area→Table* — rejected: would make restaurant cascade-delete fail; the emptiness rule is a domain rule, enforced in the service.
  - *Single level (areas only, floor as a string)* — rejected by the clarification: floors are first-class for floor-scoped screens later.
  - *Denormalize `restaurantId` onto `Area`/`Table`* — deferred: queries join through the relation; revisit only if list queries prove slow (volumes are small).

## 9. Visual floor-plan canvas — interaction library & persistence

- **Decision**: Build a **DOM-based, per-floor canvas** where each table is an absolutely-positioned node inside a floor container; dragging updates normalized `(x, y)`. Use **`@dnd-kit`** classic line — **only `@dnd-kit/core@6.3.1` + `@dnd-kit/utilities@3.2.2`** (catalog-pinned; `@dnd-kit/accessibility` is a transitive dep of core, not installed directly) — for the drag interaction because it ships **keyboard dragging + ARIA live-region announcements** out of the box (via the `accessibility`/`announcements` props on `DndContext`) — required to keep the dashboard WCAG 2.2 AA (FR-035) even for a drag feature. This is **free (x,y) positioning, not list sorting**, so we use `useDraggable` + a `PointerSensor` + a `KeyboardSensor` (custom `coordinateGetter` mapping arrow keys to fixed px steps) — **no `SortableContext`/`@dnd-kit/sortable`**. Tables with `null` position render in a **default grid layout** (FR-043), grouped by area. Positions persist via a **batch save** `PUT /floors/:id/layout` (array of `{tableId, x, y}`) on drop, with `positionX/positionY` also accepted by `PATCH /tables/:id` for single moves.
- **Rationale**: A `<canvas>`/WebGL library (e.g. `konva`) renders to a bitmap with no DOM nodes — poor for keyboard and screen readers, conflicting with the AA requirement. `@dnd-kit` keeps tables as real focusable DOM elements (composing with `@repo/ui`/Tailwind), giving accessible drag plus pointer drag. Verified (mid-2026) that the alternatives — Atlassian *pragmatic-drag-and-drop* and *react-aria DnD* — are **list/drop-target oriented (HTML5-DnD / collections) and cannot do free (x,y) translation**, so `@dnd-kit` remains the right fit despite its classic line being in maintenance-freeze (stable, React-19-safe; the pre-1.0 `@dnd-kit/react` rewrite is intentionally **not** adopted). Normalized coordinates + a batch save fit the "arrange a floor, then save" interaction and keep position presentational (FR-045).
- **Alternatives considered**:
  - *Atlassian `pragmatic-drag-and-drop` / `react-aria` DnD* — actively maintained and accessible, but built around reordering/drop-targets (HTML5 DnD / collections); no smooth free-xy translation ⇒ wrong tool for a floor-plan plane; rejected.
  - *`@dnd-kit/react` (0.x rewrite)* — declares React 19 but is pre-1.0 / API still churning; rejected for production, watch for a future migration.
  - *`react-konva` / `konva`* — best raw 2D ergonomics but canvas-based ⇒ fails the accessibility bar; rejected.
  - *Hand-rolled pointer-events drag* — no dependency, but we'd reimplement keyboard dragging + ARIA announcements that `@dnd-kit` already provides; rejected for the a11y surface.
  - *Per-table `PATCH` on every pointer move* — chatty; we save on drop (single) or batch per floor.

## 10. Pagination strategy (defensive everywhere, mostly invisible)

- **Decision**: **Offset/page-based** pagination on every list endpoint. A generic envelope `{ items, total, page, pageSize }` (schema helper `paginated(itemSchema)` in `@repo/schemas`) and a `paginationQuerySchema` (`page` ≥1 default 1, `pageSize` 1..N). **Per-surface page sizes**: admin restaurant list **20**; tables / floors / areas **200** (generous). The client renders the pager **only when `total > pageSize`** (FR-046), so normal volumes show no pager. The customer app does not list tables, so it is unaffected.
- **Rationale**: Implements FR-046/FR-047 and SC-013/SC-014/SC-015 — a defensive bound against spammed areas/tables that stays invisible at realistic volumes. Offset paging gives the admin real page numbers; data volumes (dozens of restaurants, ≤~150 tables) don't justify cursor complexity.
- **Alternatives considered**:
  - *Cursor pagination* — better for huge/infinite scroll, but no page numbers and more client complexity; the abuse-guard threshold is far above normal use.
  - *No pagination on tables ("load all")* — rejected after clarification: leaves lists unbounded under abuse. Generous page size achieves the same UX while staying bounded.

## 11. Admin restaurant management surface

- **Decision**: The `admin` app gains a **plain, functional management view** per restaurant that reuses the **same REST contract** as the dashboard (floors/areas/tables CRUD, bulk add, `status` toggle) — no new endpoints. It deliberately omits the guided wizard and the visual canvas (FR-048/FR-050). Implemented as `admin/features/{restaurants,floors,areas,tables}/` calling the shared endpoints; same validation, uniqueness, and destructive-confirmation rules apply.
- **Rationale**: The contract is the single source of truth (Constitution I); the admin surface is just another client of it. "Plain, no canvas/wizard" matches the clarified intent and keeps admin lightweight.
- **Alternatives considered**: *Separate admin-only endpoints* — rejected: duplicates the contract and risks drift; the same endpoints serve both clients.

## 12. New error codes & localization

- **Decision**: Add to `ErrorCode`: `TABLE_LABEL_TAKEN`, `TABLE_NOT_FOUND`, `GO_LIVE_REQUIRES_TABLE`, `FLOOR_NAME_TAKEN`, `AREA_NAME_TAKEN`, `FLOOR_NOT_FOUND`, `AREA_NOT_FOUND`, `FLOOR_NOT_EMPTY`, `AREA_NOT_EMPTY`, each with a Turkish message in `@repo/i18n`. Reuse `SLUG_TAKEN`, `RESTAURANT_NOT_FOUND`, `VALIDATION_ERROR`.
- **Rationale**: Constitution I — each distinct UI failure needs a stable code + TR mapping. These cover every new failure shape (table, floor, area uniqueness/existence/non-empty).

## 13. Accessibility approach (WCAG 2.2 AA + minimums)

- **Decision**: Build from `@repo/ui` (Base UI) primitives; apply explicit minimums via Tailwind (≥44px targets, ≥16px base text, AA-contrast tokens); no time-limited interactions; plain Turkish labels. For the **canvas**, use `@dnd-kit`'s keyboard sensor + screen-reader announcements so tables can be repositioned without a mouse, and provide a non-canvas list fallback for all table actions. Validation: a manual WCAG 2.2 AA pass documented in quickstart.
- **Rationale**: Matches FR-035/SC-009 and the "possibly older users" concern. The canvas is the one risky surface for a11y; `@dnd-kit` + a list fallback keeps it conformant.
- **Alternatives considered**: *Add axe/Playwright a11y CI* — deferred (no FE test harness today).

## 14. Customer placeholder menu & "not available" gating

- **Decision**: `customer` `/s/[slug]/t/[tableId]` prefetches the restaurant by slug; renders the placeholder menu **only if** `status === "ACTIVE"` **and** `tableId` resolves to a table of that restaurant; otherwise a friendly "not available yet" page. Root `/s/[slug]` renders the "scan your table's QR" landing (or "not available" when inactive). Table validity via `GET /restaurants/:slug/tables/:tableId`.
- **Rationale**: Implements US4 + FR-028/029/030 and SC-007. Reuses the `fetchRestaurantBySlug` (404→null) pattern. Floors/areas/canvas are staff-side and do not affect the customer path.

## 15. Dependency additions

- **Decision**:
  - `dashboard`: add `qrcode.react` (`4.2.0`, self-typed — no `@types/*`) and `@dnd-kit/core` (`6.3.1`) + `@dnd-kit/utilities` (`3.2.2`) via `pnpm --filter dashboard add …`, versions pinned in the workspace `catalog:`. Also add `NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN` to the dashboard's env / `.env.example` (QR target domain).
  - `customer`: add `@repo/api-client`, `@repo/query`, `@repo/schemas`, `zod` (catalog refs) — it currently has only `@repo/ui`.
  - `admin`: already has the data-fetching stack; add feature folders only (no new runtime deps expected).
- **Rationale**: Project memory (CLI-first; catalog versions). Library currency verified (mid-2026): `qrcode.react@4.2.0` replaces the stale, untyped `qrcode`; `@dnd-kit` classic v6 kept (rewrite/alternatives evaluated and rejected — see §3/§9). The rest of the catalog stack (Next 16.2.7, React 19.2.x, Zod 4.4.3, TanStack Query 5.101, RHF 7.77 + resolvers 5.4, Tailwind 4.3, Prisma 7, NestJS 11, TS 5.9) confirmed current; TS 6.0 exists but is intentionally **not** adopted (caret-shielded; separate migration).
