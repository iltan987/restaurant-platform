# Quickstart & Validation: Menu Domain

**Feature**: `003-menu-domain`. This guide proves the slice works end-to-end. It references the
[contract](./contracts/api.md) and [data model](./data-model.md) rather than restating them.

## Prerequisites

```bash
pnpm install
docker compose up -d            # Postgres 18 + MinIO (S3-compatible, new in this feature)
pnpm --filter @repo/db db:generate
pnpm --filter @repo/db db:migrate     # applies the new menu models + standard-allergen backfill
pnpm dev                        # api :3000, dashboard :3001, customer :3002, admin :3003
```

**Env (api `.env`)** — new keys for object storage (dev values target MinIO):
`S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
`MEDIA_PUBLIC_BASE_URL`. See `apps/api/.env.example`. The dev MinIO bucket is created on first
`docker compose up` (init step in compose).

## Automated checks (the source of truth)

```bash
pnpm --filter api test            # service unit specs (guards, seeding, media confirm)
pnpm --filter api test:e2e        # endpoint contracts (categories→menu tree)
pnpm --filter @repo/core test     # pure helpers: pricing, unit-price, availability, config-validate
pnpm lint && pnpm typecheck
```

`@repo/core` pure-helper tests are the heart of SC-003/SC-004 — exhaustive cases for effective
price, unit-price normalization, midnight-crossing/multi-day windows, and configuration validation.

## Manual end-to-end scenarios

Map to the spec's user stories; run against a freshly created restaurant.

### US1 — build a menu (P1)
1. Create a restaurant (admin) → confirm the **standard allergen set is already present**
   (`GET /restaurants/:rid/allergens`) — SC-007.
2. Create category "İçecekler"; add item "Çay" priceMinor 1000 (₺10). Reorder two categories;
   hide one. Toggle an item out-of-stock.
3. Attempt to delete a non-empty category → `CATEGORY_NOT_EMPTY` (Turkish message).

### US2 — options (P2)
1. On a "Pizza" item add a **required single-select** group "Boy" (Küçük/Orta/Büyük) and an
   **optional multi-select** group "Malzemeler" with `defaultSelected` ingredients (Soğan) and
   priced add-ons (+Mantar ₺15).
2. Verify `effectivePriceMinor` for "Büyük, soğansız, +Mantar" = base + size delta + 1500, and that
   omitting a size fails configuration validation. (Covered by `@repo/core` tests; spot-check via
   the item editor's live price.)

### US3 — info & dietary (P3)
1. Set description, calories, serving 500 g on an item priced ₺120 → unit price shows **₺240/kg**.
2. Add a custom allergen "Domates"; assign it + a standard one to the item.
3. Tag the item "vegan"; later confirm search matches "vegan" (US6).

### US4 — availability (P4)
1. Give an item a window **Mon & Fri 15:00–16:00** → `orderableNow` true only then; a 22:00–02:00
   window is orderable at 01:00; an out-of-stock item is never orderable. (Edge cases in core tests.)

### US5 — media (P5)
1. In the item editor, upload a photo (≤8 MB) → becomes cover; upload a second photo + an mp4;
   reorder so a different photo is cover.
2. Try a 60 MB video → refused (`MEDIA_TOO_LARGE`); try a 6th asset → `MEDIA_LIMIT_REACHED`; try a
   `.txt` → `MEDIA_TYPE_NOT_ALLOWED`. Confirm no dangling media appears after a cancelled upload.

### US6 — public menu + search (P6) — backend now, UI after design
1. `GET /api/menu/by-slug/:slug` for an **ACTIVE** restaurant → full visible `MenuTree` with
   `orderableNow` per item; hidden category absent.
2. Same call for a **non-active** restaurant → 404 `RESTAURANT_NOT_FOUND`.
3. Client-side search over the returned tree matches item name/description/tag and category name.
4. **Customer visual menu is built once the design handoff lands** (research §12) — validate the
   endpoint/payload now; the UI is a later presentation task.

## Expected outcomes

- All automated checks green; new error cases return the correct `ErrorCode` + Turkish message.
- Prices/unit-prices exact (SC-003); availability correct across edge cases (SC-004); disallowed
  uploads refused pre-store with no orphans (SC-005); hidden categories & non-active menus never
  exposed (SC-006); standard allergens present on every new restaurant (SC-007).
