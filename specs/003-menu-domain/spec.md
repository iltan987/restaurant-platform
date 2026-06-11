# Feature Specification: Menu Domain

**Feature Branch**: `003-menu-domain`

**Created**: 2026-06-10

**Status**: Draft

**Input**: User description: "Menu domain (Slice A of the Adisyon system) — categories and menu items with optional media, allergens, tags, option groups, and availability windows, managed in the dashboard and consumed read-only by the customer app (and, later, the waiter adisyon)."

## Overview

This feature establishes the **menu** for a restaurant: the catalog of categories and items
(with prices and rich, optional attributes) that the rest of the platform builds on. It is the
foundation slice of the larger "Adisyon" (order-ticket) system — waiters will later add orders by
picking menu items, and diners browse the same menu after scanning a table QR. This slice delivers
**menu authoring (dashboard)** and **read-only menu consumption (customer app)**; it deliberately
excludes the order/adisyon entity, customer self-ordering, payments, and real-time, which are
later slices that depend on this one.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build the menu: categories & priced items (Priority: P1)

A restaurant's staff create the menu's backbone in the dashboard: named **categories** (e.g.
*Başlangıçlar, Ana Yemekler, İçecekler*) and **items** within them, each with a name and a price.
They reorder categories and items, hide a category that isn't ready, and mark an item as
out-of-stock ("tükendi") without deleting it.

**Why this priority**: Nothing else in the platform — the customer menu, the future adisyon — has
anything to show until items with prices exist. A bare priced menu is the minimum viable, valuable
slice.

**Independent Test**: Create a category, add a flat-price item to it, reorder two items, hide a
category, toggle an item out-of-stock — and confirm each change is reflected when the menu is read
back. Delivers value as a usable (if plain) menu.

**Acceptance Scenarios**:

1. **Given** a restaurant with no menu, **When** staff create a category named "İçecekler", **Then** it appears in the restaurant's category list.
2. **Given** a category exists, **When** staff add an item with a name and price, **Then** the item appears under that category with its price.
3. **Given** several categories/items exist, **When** staff reorder them, **Then** the new order persists and is returned on the next read.
4. **Given** an item is in stock, **When** staff mark it out-of-stock, **Then** it is flagged unavailable but still present in the menu.
5. **Given** a category contains items, **When** staff attempt to delete that category, **Then** the system prevents it and explains the category must be emptied first.
6. **Given** a category is hidden, **When** the menu is read for a diner, **Then** the hidden category and its items are excluded.

---

### User Story 2 - Item options: variants, extras, and add/remove ingredients (Priority: P2)

Staff configure how an item can be customized: a **required single choice** (e.g. *Boy:
Küçük/Orta/Büyük*), **optional paid add-ons** (e.g. *+ Mantar ₺15*), and **included ingredients
that can be removed** (e.g. *Soğan*, droppable for "soğansız"). The effective price of a chosen
configuration is the item's base price plus the price changes of the selected options.

**Why this priority**: This is what makes the menu usable for real ordering by the future adisyon —
a waiter must be able to record "büyük boy, soğansız, ekstra peynirli" and get the right price. It
is the most order-critical layer above bare items.

**Independent Test**: Define a size group (required, pick one) and an extras group (optional, pick
many) with default-on removable options on an item; select a configuration and verify the computed
price equals base + selected deltas, and that required-group rules are enforced.

**Acceptance Scenarios**:

1. **Given** an item with a required single-select size group, **When** a configuration omits a size, **Then** the configuration is rejected as incomplete.
2. **Given** an item with an optional multi-select extras group, **When** two paid extras are selected, **Then** the effective price is base price plus both deltas.
3. **Given** an item with an ingredient on by default and removable, **When** it is removed, **Then** the effective price is unchanged and the configuration records the removal.
4. **Given** an item with no option groups, **When** it is ordered, **Then** its effective price equals its base price with no extra steps.

---

### User Story 3 - Descriptive & dietary information (Priority: P3)

Staff enrich items with a **description**, **calorie** count, a **serving amount + unit** (e.g.
*500 g*, *1 adet*, *330 ml*) from which a **normalized unit price** is shown (e.g. *₺240/kg*,
*₺60/adet*), **allergens** (a per-restaurant list seeded with the standard set, extendable with
custom entries such as *Domates*), and reusable **tags** (e.g. *vegan, acılı*). Diners and staff
can see this information; allergens and tags are searchable/filterable.

**Why this priority**: This is the information that helps a diner choose and keeps a restaurant
compliant and trustworthy, but the menu functions without it. It layers on top of P1/P2.

**Independent Test**: Add a description, calories, a serving amount/unit, two allergens (one
custom), and a tag to an item; verify the unit price is computed and displayed, and the allergens
and tags are returned with the item and match in search.

**Acceptance Scenarios**:

1. **Given** an item priced ₺120 with serving amount 500 g, **When** the item is viewed, **Then** a unit price of ₺240/kg is shown alongside the price.
2. **Given** a restaurant was just created, **When** staff open the allergen list, **Then** the standard allergen set is already present (seeded).
3. **Given** the standard allergen list, **When** staff add a custom allergen "Domates", **Then** it can be assigned to items like any standard allergen.
4. **Given** items tagged "vegan", **When** a diner searches "vegan", **Then** matching items are returned.

---

### User Story 4 - Time-limited availability (Priority: P4)

Staff restrict when an item can be ordered by defining one or more **availability windows**, each a
set of **days of week** plus a **start–end time** (a window whose end is earlier than its start
crosses midnight). An item with no windows is always available. The system can answer "is this item
orderable right now?" — combining the manual in-stock flag with the windows — so consumers can show
or block the item accordingly.

**Why this priority**: Valuable for breakfast/seasonal/late-night items, but most items are always
available, so it is an enhancement rather than core.

**Independent Test**: Give an item a window of Monday & Friday 15:00–16:00; verify the item reports
orderable only on those days within that time (evaluated in Türkiye time) and not orderable
otherwise, and that an item with no windows always reports orderable when in stock.

**Acceptance Scenarios**:

1. **Given** an item with a window Mon & Fri 15:00–16:00, **When** "orderable now?" is evaluated on Monday at 15:30, **Then** it reports orderable.
2. **Given** the same item, **When** evaluated on Tuesday at 15:30, **Then** it reports not orderable, with the reason being outside its serving window.
3. **Given** an item with a window 22:00–02:00, **When** evaluated at 01:00, **Then** it reports orderable (the window crosses midnight).
4. **Given** an item that is out-of-stock, **When** "orderable now?" is evaluated inside a valid window, **Then** it reports not orderable due to stock.
5. **Given** an item with no windows and in stock, **When** evaluated at any time, **Then** it reports orderable.

---

### User Story 5 - Item media: photos & videos (Priority: P5)

Staff attach an ordered set of **media** to an item — photos and occasionally short videos, up to a
generous cap — uploaded from the browser. The first photo acts as the cover. Uploads are
constrained by allowed file types and size limits, and rejected media is reported clearly.

**Why this priority**: Media makes the customer menu appetizing but is not needed by the adisyon
and carries the most infrastructure; it is the right candidate to land after the functional layers.

**Independent Test**: Upload two photos and one video to an item within the limits, reorder them so
a different photo is the cover, and attempt an over-limit/disallowed file; verify the accepted media
are stored and ordered, the cover reflects the new order, and the rejected upload is refused with a
clear reason.

**Acceptance Scenarios**:

1. **Given** an item with no media, **When** staff upload a valid photo, **Then** it becomes the item's cover.
2. **Given** an item with several media, **When** staff reorder them, **Then** the cover and gallery order update accordingly.
3. **Given** the per-item media cap is reached, **When** staff attempt another upload, **Then** it is refused with a clear message.
4. **Given** a file exceeding the size limit or of a disallowed type, **When** staff attempt to upload it, **Then** it is refused before storing, with the reason shown.

---

### User Story 6 - Diner browses the menu by QR (Priority: P6)

A diner scans a table's QR code and lands on the restaurant's menu on their phone. They browse
categories, **search across the whole menu** (matching item names, descriptions, and tags, as well
as category names), and open an item to see its details — media, price and unit price, calories,
allergens, tags, included ingredients/options (shown for information), and whether it is currently
available. The diner cannot order in this slice.

**Why this priority**: This is the public-facing payoff of the menu, but it is read-only and its
visual implementation depends on a separate, incoming design; the underlying menu data and the
ability to retrieve it publicly are what this slice guarantees.

**Independent Test**: For an active restaurant, retrieve the public menu by its tenant identity and
confirm it contains exactly the visible categories/items with all their attributes; perform a
search term and confirm only matching items/categories are returned; confirm a hidden category and
a non-active restaurant's menu are not exposed.

**Acceptance Scenarios**:

1. **Given** an active restaurant with a menu, **When** a diner opens the menu, **Then** all non-hidden categories and their items (with attributes) are shown in the configured order.
2. **Given** the diner types a search term, **When** it matches an item name, description, tag, or a category name, **Then** matching results are shown effectively instantly.
3. **Given** an item is out-of-stock or outside its serving window, **When** the diner views it, **Then** it is shown as unavailable with the reason.
4. **Given** a restaurant that is not active, **When** its menu is requested publicly, **Then** the menu is not exposed.

---

### Edge Cases

- **Deleting a category that still has items** → prevented; the category must be emptied first (consistent with the platform's existing non-empty-removal guard).
- **Deleting an allergen or tag that is assigned to items** → a standard (seeded) allergen is protected and cannot be deleted; a custom allergen or any tag can be deleted and its assignments are removed from the affected items, leaving the items otherwise intact.
- **Removing a standard (seeded) allergen** vs a custom one → defined behavior (standard set is protected from deletion; custom ones are freely removable).
- **Option group rules** → `minSelect`/`maxSelect`/`required` are internally consistent and enforced when a configuration is validated (e.g. a required group must have at least one selection; selections cannot exceed `maxSelect`).
- **Duplicate names** → category names unique within a restaurant; tag/allergen labels unique within a restaurant; item names need not be globally unique.
- **Availability window crossing midnight** (end < start) and **overlapping windows** → both handled deterministically by the orderability evaluation.
- **Unit price with a zero/empty serving amount** → no unit price shown rather than a divide-by-zero.
- **Media upload that fails after the upload slot is granted** (network drop) → no dangling visible media; only confirmed uploads appear.
- **Very large menu** (hundreds of items) → menu retrieval and search remain responsive.
- **Currency math** → all prices and deltas are exact integer minor units (kuruş); no floating-point rounding error in computed effective or unit prices.

## Requirements *(mandatory)*

### Functional Requirements

**Categories**

- **FR-001**: The system MUST let staff create, rename, reorder, hide/show, and delete categories within a restaurant.
- **FR-002**: The system MUST keep category names unique within a restaurant and reject duplicates with a clear, localized message.
- **FR-003**: The system MUST prevent deleting a category that still contains items, explaining it must be emptied first.
- **FR-004**: The system MUST exclude hidden categories (and their items) from any diner-facing menu.

**Items**

- **FR-005**: The system MUST let staff create, edit, reorder (within a category), and delete items, each with at minimum a name and a base price.
- **FR-006**: The system MUST store all prices as exact integer minor units (kuruş) and never lose precision in any computed price.
- **FR-007**: The system MUST let staff toggle an item's in-stock state without deleting it, and reflect that state to consumers.
- **FR-008**: The system MUST let staff optionally set a description, calorie count, and a serving amount with a unit on an item.
- **FR-009**: The system MUST compute and expose a normalized unit price (e.g. per kg, per litre, per piece) when an item has a serving amount and unit, and omit it otherwise.

**Allergens & tags**

- **FR-010**: The system MUST seed every restaurant with the standard allergen set when the restaurant is created.
- **FR-011**: The system MUST let staff add, edit, and remove custom allergens for their restaurant, while protecting the standard seeded set from deletion.
- **FR-012**: The system MUST let staff declare which allergens an item contains (many-to-many) and return them with the item.
- **FR-013**: The system MUST let staff manage a reusable set of tags per restaurant and assign them to items (many-to-many).
- **FR-014**: Allergen and tag labels MUST be unique within a restaurant.

**Options (variants / extras / ingredients)**

- **FR-015**: The system MUST let staff define zero or more option groups on an item, each with a name, a selection rule (minimum and maximum selectable, whether required), and an order.
- **FR-016**: The system MUST let staff define options within a group, each with a name, a price change (which may be zero), an availability flag, an order, and a "selected by default" flag.
- **FR-017**: The system MUST express, via these primitives, (a) a required single choice (variant), (b) optional priced add-ons, and (c) default-included ingredients that can be removed at no charge.
- **FR-018**: The system MUST validate a chosen configuration against every group's selection rules and reject incomplete or invalid configurations with a clear reason.
- **FR-019**: The system MUST compute a configuration's effective price as the item base price plus the price changes of all selected options.

**Availability**

- **FR-020**: The system MUST let staff define zero or more availability windows per item, each covering a set of days of the week and a start–end time, where an end earlier than the start denotes crossing midnight.
- **FR-021**: The system MUST evaluate "orderable right now?" for an item as: in stock AND (no windows OR the current Türkiye-local time falls within at least one window), and expose this result with a reason when not orderable.

**Media**

- **FR-022**: The system MUST let staff attach an ordered set of media (photos and videos) to an item, up to a defined per-item cap, with the first photo serving as the cover.
- **FR-023**: The system MUST enforce allowed media types and maximum sizes and refuse non-conforming uploads with a clear reason before they are stored.
- **FR-024**: The system MUST ensure only successfully completed uploads appear as item media (no dangling/partial media).
- **FR-025**: The system MUST let staff reorder and remove an item's media.

**Search & consumption**

- **FR-026**: The system MUST expose a restaurant's full menu for diner consumption, containing only visible categories/items with all their public attributes in the configured order.
- **FR-027**: The system MUST NOT expose the menu of a restaurant that is not active.
- **FR-028**: Diners and staff MUST be able to search the menu by a term that matches item names, descriptions, tags, and category names, with results returned effectively instantly.
- **FR-029**: Consumers MUST be able to see, per item, its availability state and the reason when unavailable (out-of-stock or outside serving window).

**Cross-cutting**

- **FR-030**: All staff menu-management capabilities MUST be available in the dashboard; all diner capabilities are read-only.
- **FR-031**: All user-facing text in this slice MUST be Turkish.
- **FR-032**: Every failure surfaced to a user MUST carry a stable, localized message (no raw/technical errors leaking to the UI).

### Key Entities *(include if feature involves data)*

- **Category**: a named grouping of items within a restaurant; has an order and a hidden/visible state. Belongs to a Restaurant; contains MenuItems.
- **MenuItem**: a sellable menu entry; has name, description, base price (kuruş), in-stock flag, optional calories and serving amount + unit, and an order within its category. Owns its option groups, media, and availability windows; references allergens and tags.
- **Allergen**: a per-restaurant, reusable allergen label; marked as standard (seeded, protected) or custom. Many-to-many with MenuItems.
- **Tag**: a per-restaurant, reusable descriptive label (e.g. dietary/marketing). Many-to-many with MenuItems; included in search.
- **OptionGroup**: a customization group on an item, with a name, selection rule (min/max selectable, required), and order. Owns Options.
- **Option**: a choice within a group, with a name, price change (kuruş, may be zero), availability flag, default-selected flag, and order.
- **AvailabilityWindow**: a per-item rule of days-of-week plus a start–end time defining when the item may be ordered; absence of any window means always available.
- **MediaAsset**: an ordered photo or video belonging to an item; the first photo is the cover; subject to type/size limits and a per-item cap.
- **Restaurant** *(existing)*: owns categories, items, allergens, and tags; its active state gates public menu exposure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A staff member can create a usable category-and-item menu (one category, one priced item) in under 2 minutes starting from an empty menu.
- **SC-002**: A diner viewing a menu of up to 300 items sees the full menu within 2 seconds on a typical mobile connection, and search results update within 200 ms of typing as perceived instant.
- **SC-003**: 100% of computed effective prices and unit prices are exact (no rounding error), verified across variant/extra/ingredient combinations.
- **SC-004**: "Orderable right now?" returns the correct result for 100% of tested cases, including multi-day windows, midnight-crossing windows, out-of-stock items, and items with no windows.
- **SC-005**: 100% of disallowed media uploads (over-size or wrong type) are refused before storage, and no partial/dangling media ever appears on an item.
- **SC-006**: Hidden categories and non-active restaurants' menus are never exposed to diners in any tested case.
- **SC-007**: Every restaurant has the complete standard allergen set available immediately upon creation, with no manual setup.

## Assumptions

- **One implicit menu per restaurant**: the structure is a flat Category → MenuItem; a higher "multiple named menus" layer is explicitly out of scope and can be added later above categories.
- **Standard allergen set**: the seeded set is the commonly recognized standard allergen list; the exact membership is a content decision finalized during planning, and restaurants extend it with custom entries.
- **Media limits** (generous defaults, finalized in planning): up to ~5 media per item; photos and short videos only, via an allowed-type list, with per-type maximum sizes; uploads go directly from the browser to object storage, with the backend granting and constraining each upload.
- **Storage**: object storage is S3-compatible — a self-hosted, free option in development and a managed bucket in production — configured per environment; this reuses one code path.
- **Timezone**: all availability evaluation uses Türkiye local time (single national timezone, no daylight saving).
- **Customer UI dependency**: the diner-facing visual implementation (User Story 6) depends on a separate, incoming design handoff; this slice guarantees the menu data and its public read-only availability, and the customer UI is built once the design lands. The dashboard management UI follows the platform's existing patterns and needs no separate design.
- **Platform conventions reused**: this feature follows the established client↔server contract (shared schemas, stable error codes, localized Turkish messages), the API-only-touches-the-database rule, and centralizes money, unit-price, and orderability helpers in the shared core package, mirroring the existing restaurants module as the template.
- **Out of scope (later slices)**: the order/adisyon entity, customer self-ordering/cart/checkout, payments and bill-splitting, and real-time updates. This slice is the menu foundation those depend on.
- **Language**: Turkish-only for this slice; the data model does not preclude adding other languages later, but no translation UI is built now.
