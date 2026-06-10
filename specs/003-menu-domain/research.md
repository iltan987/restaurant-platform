# Phase 0 Research: Menu Domain

**Feature**: `003-menu-domain` · **Date**: 2026-06-10

This resolves the open technical choices behind the spec. The big product questions were settled
in brainstorming; what remains are implementation decisions for storage, the unified option model,
availability evaluation, unit-price math, search, and the seeded allergen set.

---

## §1 — Object storage & direct media upload (R2 / MinIO, presigned uploads)

**Decision**: Use the **AWS S3 SDK v3** (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`,
catalog-pinned) against an **S3-compatible** endpoint — **MinIO** in dev (added to
`docker-compose.yml` beside Postgres), **Cloudflare R2** in prod — selected purely by env vars, one
code path. Uploads go **browser → storage directly** via a **presigned `PUT` URL** the API mints;
the browser never streams bytes through NestJS.

**Flow** (two API calls + one direct PUT):
1. `POST /api/menu-items/:id/media/upload-url` — body declares `type` (PHOTO|VIDEO), `mimeType`,
   `sizeBytes`. Server **validates type + size against limits** (§2), enforces the per-item cap,
   generates a unique `storageKey` (e.g. `restaurants/<rid>/items/<iid>/<cuid>.<ext>`), and returns
   a short-lived presigned PUT URL + the `storageKey`.
2. Browser `PUT`s the file bytes straight to the URL.
3. `POST /api/menu-items/:id/media` — confirms with `{ storageKey, ... }`. Server issues a **`HEAD`**
   against the object to verify it exists and its real size/type match the grant, **then** persists
   the `MediaAsset` row. This guarantees FR-024 (no dangling/partial media): a row exists only after
   a verified object.

**Public serving**: objects are served from a public base URL (`MEDIA_PUBLIC_BASE_URL` — the R2
public bucket / CDN domain in prod, the MinIO endpoint in dev). The stored `storageKey` + base URL
compose the public URL; we store the key, not a full URL, so the domain stays env-portable.

**Rationale**: S3 SDK v3 is the portable standard; presigned PUT keeps large video off the Node
process; the confirm-with-HEAD step is the cheapest way to prevent orphan media without a background
reconciler. **Alternatives rejected**: proxying uploads through NestJS (memory/timeout risk on
video); a presigned **POST policy** (more capable for hard size caps but clunkier client-side — a
PUT + HEAD-verify is simpler and we already validate sizes at grant time and re-check on confirm);
Cloudinary (transcoding we don't need yet, extra vendor).

**Orphan cleanup**: an object uploaded but never confirmed is harmless (no row). A periodic
lifecycle rule on the bucket (expire unconfirmed-prefix objects) is a later ops concern, noted not
built.

---

## §2 — Media constraints (types, sizes, cap)

**Decision** (finalizing the spec's "generous defaults"):
- **Per-item cap**: **5** media assets.
- **Photos**: `image/jpeg`, `image/png`, `image/webp`, `image/avif`; **≤ 8 MB** each.
- **Videos**: `video/mp4`, `video/webm`; **≤ 50 MB** each; the first **photo** (not video) is the cover.
- Limits live as **constants in `@repo/core`** (so client and server share one source) and are
  enforced server-side at grant + confirm; the client pre-checks for instant feedback.

**Rationale**: Covers modern formats, keeps a single low-end-phone-friendly ceiling, and centralizes
the numbers so the dashboard and API never disagree. No transcoding/thumbnailing in this slice
(noted as future polish for the customer render).

---

## §3 — Unified option model (variants + extras + add/remove ingredients)

**Decision**: One `OptionGroup` → `Option` structure with a **`defaultSelected` boolean on Option**,
exactly as brainstormed. Group selection rule = `minSelect` / `maxSelect` (nullable = unbounded) /
`required`. Semantics fall out:
- **Variant** = `required`, `minSelect 1`, `maxSelect 1` (single-select). Options usually
  `defaultSelected:false`; one may be default.
- **Paid extras** = optional multi-select, options `defaultSelected:false`, `priceDeltaMinor > 0`.
- **Removable ingredients** = options `defaultSelected:true`, `priceDeltaMinor 0`, in an optional
  group; deselecting expresses "soğansız".

**Pricing & validation** are **pure functions in `@repo/core`** (`options.ts`):
- `effectivePriceMinor(item, selectedOptionIds)` = `item.priceMinor + Σ option.priceDeltaMinor`.
- `validateConfiguration(groups, selectedOptionIds)` → ok | a structured reason (required group
  empty, over `maxSelect`, under `minSelect`, unavailable option chosen, unknown option).
- The "default configuration" (what's pre-checked) = every `defaultSelected` option.

**Rationale**: One mechanism, one field added, covers all three needs; pure helpers are unit-tested
exhaustively (SC-003) and reused by the future adisyon unchanged. **Alternatives rejected**:
separate Variant/Modifier/Ingredient tables (three models for one concept; the adisyon would branch
three ways).

---

## §4 — Availability windows & "orderable now?"

**Decision**: `AvailabilityWindow` stores **`days: DayOfWeek[]`** (Prisma enum array) + **`startMin`
/ `endMin`** as **minutes since midnight** (0–1439) rather than strings — integer comparison is
trivial and avoids parsing. `endMin < startMin` ⇒ the window **crosses midnight**.

The decision helper is **pure, in `@repo/core`** (`availability.ts`):
`isOrderableNow(item, nowLocal)` where `nowLocal = { day: DayOfWeek, minutes: number }` →
`inStock && (windows.length === 0 || windows.some(w => dayMatches(w, nowLocal) && timeInWindow(w, nowLocal)))`.
Midnight-crossing handled by `startMin <= m || m < endMin` when `endMin < startMin`.

**Localization to Türkiye time happens at the edge, not in the helper**: the API derives
`{ day, minutes }` for `Europe/Istanbul` using the built-in
`Intl.DateTimeFormat(..., { timeZone: "Europe/Istanbul" })` — **no date library dependency**.
Türkiye observes a fixed UTC+3 with no DST, so this is unambiguous.

**Rationale**: Integer minutes = simple, testable comparisons; keeping the helper pure (caller
supplies "now") makes it deterministic to unit-test across all edge cases (SC-004) and equally
usable server-side and, later, client-side. **Alternatives rejected**: storing `"HH:MM"` strings
(parse overhead); pulling in `date-fns-tz`/`luxon` (unnecessary given fixed offset + `Intl`).

---

## §5 — Serving amount, unit, and unit-price display

**Decision**: `MenuItem.servingAmount` (`Decimal`, nullable) + `servingUnit` (`ServingUnit` enum,
nullable): `GRAM, KILOGRAM, MILLILITER, LITER, PIECE, PORTION`. A pure helper in `@repo/core`
(`unit-price.ts`) normalizes to a **reference unit** (mass→per kg, volume→per litre, count→per
piece; `PORTION` has no unit price) and returns a **rounded display figure in kuruş per reference
unit**, or `null` when amount is missing/zero.

**Rationale**: The unit price is a **display aid**, so rounding is acceptable there; the item's base
and effective prices remain exact integer kuruş (FR-006/SC-003 apply to those, not the derived
figure). Centralizing avoids per-app drift. **Alternatives rejected**: storing the unit price
(derivable, would desync); a generic units library (overkill for 3 reference dimensions).

---

## §6 — Search

**Decision**: **Client-side, in-memory.** The full menu loads once (the public menu tree / the
dashboard menu list); search filters in the browser across item **name + description + tag labels**
and **category names**, case/diacritic-insensitive (Turkish-aware `localeCompare`/normalization).
**No search endpoint.**

**Rationale**: Menus are small (SC-002: ≤300 items) and already fully loaded; in-memory filtering is
instant (<200 ms, SC-002) with zero backend complexity. **Alternatives rejected**: a server search
endpoint / full-text index (unjustified at this scale, adds round-trips that defeat "instant").

---

## §7 — Public menu retrieval & tenant gating

**Decision**: `GET /api/menu/by-slug/:slug` returns the **whole visible menu tree** (non-hidden
categories ordered, each with its visible items and all public attributes, options, allergens, tags,
media, availability windows, and a computed `orderableNow` + reason per item) **only when the
restaurant is `ACTIVE`** — otherwise 404 (`RESTAURANT_NOT_FOUND`), mirroring the existing customer
storefront gating from feature 002. The dashboard uses authenticated/by-slug management reads that
include hidden categories and out-of-stock items.

**Rationale**: One fetch powers both browse and client-side search; reusing the active-gate pattern
keeps tenant visibility rules consistent with the existing customer app.

---

## §8 — Seeding the standard allergen set

**Decision**: The **standard EU-14 allergen set** (Turkish labels) is seeded **per restaurant on
creation**, inside the existing restaurant-create transaction (feature 002's `restaurants.service`
already creates a default floor + area in a tx — allergen seeding joins it). Seeded rows carry
`isStandard: true` and are **protected from deletion** (service guard →
`ALLERGEN_STANDARD_PROTECTED`). The canonical list lives as a constant in `@repo/core`.

Standard set (TR): **Gluten, Kabuklu deniz ürünleri (Crustaceans), Yumurta, Balık, Yer fıstığı,
Soya, Süt, Sert kabuklu yemişler (Nuts), Kereviz, Hardal, Susam, Sülfitler, Lüpen, Yumuşakçalar
(Molluscs)**.

**Rationale**: Seeding at creation guarantees SC-007 (every restaurant ready immediately) with no
manual setup; a `@repo/core` constant keeps the list versioned in one place. **Alternatives
rejected**: a global shared allergen catalog (cross-tenant coupling; custom additions per
restaurant become awkward); seeding lazily on first menu visit (race-prone, surprising).

> **Backfill**: existing restaurants created before this feature have no seeded allergens. A one-off
> idempotent backfill (insert standard set where missing) runs with the migration — captured as a
> task.

---

## §9 — Reordering (categories, items, media, options)

**Decision**: Reuse the established ordering convention from feature 002 (`position: Int`) and the
already-cataloged **`@dnd-kit`** for drag-reorder in the dashboard. Reorder is a **batch PUT** of
ordered ids per parent (mirrors the floor-layout batch-save pattern), validated server-side that all
ids belong to the parent.

**Rationale**: Consistent with existing list ordering and the canvas reorder UX; no new dependency.

---

## §10 — New error codes & Turkish messages

Added to `ErrorCode` (+ `@repo/i18n` Turkish mappings), following the existing `*_TAKEN` /
`*_NOT_FOUND` / `*_NOT_EMPTY` idiom:

`CATEGORY_NAME_TAKEN, CATEGORY_NOT_FOUND, CATEGORY_NOT_EMPTY, MENU_ITEM_NOT_FOUND,
ALLERGEN_LABEL_TAKEN, ALLERGEN_NOT_FOUND, ALLERGEN_STANDARD_PROTECTED, TAG_LABEL_TAKEN,
TAG_NOT_FOUND, OPTION_GROUP_NOT_FOUND, OPTION_NOT_FOUND, INVALID_OPTION_CONFIG,
AVAILABILITY_WINDOW_INVALID, MEDIA_LIMIT_REACHED, MEDIA_TYPE_NOT_ALLOWED, MEDIA_TOO_LARGE,
MEDIA_OBJECT_NOT_FOUND`.

---

## §11 — New dependencies (catalog-pinned)

| Dependency | Where | Why |
|---|---|---|
| `@aws-sdk/client-s3` | `api` | S3-compatible client for R2/MinIO (presign + HEAD) |
| `@aws-sdk/s3-request-presigner` | `api` | Mint presigned PUT URLs |

Already cataloged and reused: `@dnd-kit/*` (reorder), Zod, TanStack Query, `@repo/*`. No new
frontend deps required for upload (native `fetch` PUT) or search (in-memory).

---

## §12 — Customer UI sequencing (design dependency)

**Decision**: This slice delivers the **public menu endpoint + search-ready payload** and the
**dashboard management UI** in full. The **customer-app visual menu (US6) is deferred** until the
incoming design handoff lands; its tasks are marked blocked-on-design in `tasks.md`. The endpoint
and data contract are built and testable now (via quickstart/e2e), so the customer UI is later a
pure presentation layer with no backend work left.

**Rationale**: Matches the user's explicit instruction; keeps the backend/contract on the critical
path while the design is produced in parallel.
