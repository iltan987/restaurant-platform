# Quickstart & Validation: Restaurant Onboarding & Setup

End-to-end manual validation that the feature works. Shapes/endpoints live in [data-model.md](./data-model.md) and [contracts/api.md](./contracts/api.md); this guide is the run/validate script. Hierarchy: **Restaurant → Floor → Area → Table**.

## Prerequisites

- `pnpm install` (root) — also activates husky hooks.
- Postgres running: `docker compose up -d` (Postgres 18 on :5432).
- Apply schema + client: `pnpm --filter @repo/db db:migrate && pnpm --filter @repo/db db:generate`.
- Env per app (copy each `.env.example`):
  - `api`: `DATABASE_URL`, `ADMIN_URL`, `DASHBOARD_URL` (CORS); ensure CORS allows the customer public domain too.
  - `admin`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DASHBOARD_URL`.
  - `dashboard`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_ROOT_DOMAIN` (staff subdomain root), `NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN` (customer storefront root — used to build the QR target URLs).
  - `customer`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_ROOT_DOMAIN` (its own public subdomain root, for `proxy.ts` routing).
- Run everything: `pnpm dev` (api 3000, dashboard 3001, customer 3002, admin 3003).

## Scenario A — Admin registers a restaurant (US1)

1. Open `http://localhost:3003` (admin).
2. Create a restaurant named e.g. "Köşe Lokantası".
3. **Expect**: it appears in the list with a derived unique slug and status **INACTIVE**; behind the scenes a default floor ("Zemin Kat") and area ("Genel") were created. Duplicate slug → "Bu kısa ad zaten kullanımda." (`SLUG_TAKEN`).

## Scenario B — Staff guided setup (floors, areas, tables) + go live (US2)

1. Visit the staff subdomain, e.g. `http://kose-lokantasi.localhost:3001`.
2. **Expect**: the guided **setup wizard** (onboarding `IN_PROGRESS`) with steps + progress.
3. **Floors & areas step**: the default floor/area are already present. Add a second floor ("1. Kat") and an area ("Teras") — adding a duplicate floor name → "Bu kat adı zaten kullanımda." (`FLOOR_NAME_TAKEN`); a duplicate area name within the same floor → `AREA_NAME_TAKEN`; the same area name on a different floor is allowed.
4. **Tables step**: add tables, choosing an area (defaults to the sole area for single-section venues); try "add N tables" quick-add. Duplicate label (anywhere in the restaurant) → "Bu masa adı zaten kullanımda." (`TABLE_LABEL_TAKEN`).
5. With **zero** tables, confirm **"Go live" is disabled**; the API rejects forced activation with `GO_LIVE_REQUIRES_TABLE`.
6. With ≥1 table, click **Go live** → restaurant becomes **ACTIVE**, onboarding `COMPLETED`.
7. Reload → **management view** (not the wizard).
8. **Skip path**: on a fresh in-progress restaurant, trigger "leave/skip setup" → a **warning/confirmation** (never instant); confirming with ≥1 table offers "Go live now?" defaulting to **No**; stays INACTIVE, onboarding `SKIPPED`, lands on management.
9. **Resume**: leave mid-setup and return → previously added floors/areas/tables persist.
10. **Empty removal guard**: try to delete a floor that still has areas → `FLOOR_NOT_EMPTY`; an area that still has tables → `AREA_NOT_EMPTY`.

## Scenario C — QR download & print (US3)

1. In management/wizard, for one table choose **download QR** → a PNG downloads, encoding `https://<slug>.<NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN>/t/<tableId>` (the customer storefront).
2. Choose **print all** / **download all** → a print-friendly page with every table's code + label; verify ≤2 interactions (SC-003).
3. Rename a table's label (or move it on the canvas), reprint → the encoded URL is unchanged (uses stable `tableId`) (SC-006 / FR-045).

## Scenario D — Customer scans a table QR (US4)

1. While the restaurant is **ACTIVE**, open a table URL: `http://<slug>.localhost:3002/t/<tableId>`.
2. **Expect**: mobile-first **placeholder menu** scoped to that table.
3. Deactivate the restaurant → reopen → **"not available yet"**, no menu (SC-007), even though the code was printed.
4. Open the subdomain **root** `http://<slug>.localhost:3002/` → "scan the QR on your table" landing (or "not available" if inactive).
5. Unknown slug or unknown `tableId` → clear not-found/not-available result.

## Scenario E — Visual floor-plan canvas (US7)

1. In the dashboard, open a floor's **canvas**. **Expect**: an un-arranged floor shows all its tables in a default equal layout, grouped by area.
2. **Drag** a table to a new position; on drop the layout saves (`PUT /floors/:id/layout`). Reload → positions persist (SC-012).
3. **Keyboard**: focus a table and move it with the keyboard (arrow keys via the `@dnd-kit` keyboard sensor) → confirm it can be repositioned without a mouse, with screen-reader announcements (FR-035).
4. Confirm arranging is **never required**: a restaurant with no canvas arrangement can still finish setup and go live.

## Scenario F — Rare edits & admin maintenance (US5/US6)

1. Staff management: add a table post-setup → it immediately has a downloadable QR. Rename/move tables; remove a table → confirm warning that printed codes stop working; the URL no longer resolves. Adjust floors/areas. Toggle live/not-live.
2. **Admin management**: open a restaurant's management view in the admin app → manage its floors/areas/tables and toggle active/inactive using a **plain** UI (no wizard, no canvas), with the same validation/confirmation rules. Edit name/slug (changing a live restaurant's slug warns about breaking links). Delete a restaurant with tables → confirmation states tables + QRs become invalid; deletion cascades floors→areas→tables.

## Scenario G — Pagination (defensive, mostly invisible)

1. With a handful of restaurants, confirm the admin list shows **no pager** (single page).
2. Create enough restaurants to exceed 20 → the **pager appears**; navigation works (SC-014).
3. A restaurant with 30 tables shows **all 30** in the dashboard/admin with no pager (SC-013); only abusive volumes (>200) spill to a second page (SC-015).

## Automated checks (must pass)

- `pnpm --filter api test` — service unit specs: slug uniqueness, **unique table label** (`TABLE_LABEL_TAKEN`), **floor/area uniqueness** (`FLOOR_NAME_TAKEN`/`AREA_NAME_TAKEN`), **non-empty removal** (`FLOOR_NOT_EMPTY`/`AREA_NOT_EMPTY`), **go-live-requires-table** (`GO_LIVE_REQUIRES_TABLE`), status/onboarding transitions, bulk-add, default floor/area on create, layout save.
- `pnpm --filter api test:e2e` — endpoint contracts for restaurant + floor + area + table routes in [contracts/api.md](./contracts/api.md), including pagination envelopes.
- `pnpm lint && pnpm typecheck` — clean across workspaces.

## Accessibility validation (FR-035 / SC-009)

- Manual WCAG 2.2 AA pass on the dashboard: keyboard-only operation (including canvas drag via keyboard), visible focus, AA contrast, interactive targets ≥44px, base text ≥16px, no time-limited interactions, Turkish labels in plain language.
