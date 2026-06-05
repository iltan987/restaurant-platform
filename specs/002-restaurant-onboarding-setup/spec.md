# Feature Specification: Restaurant Onboarding & Setup

**Feature Branch**: `002-restaurant-onboarding-setup`

**Created**: 2026-06-05

**Status**: Draft

**Input**: User description: "admin creates restaurant the restaurant entry using admin app (and later when auth implemented temporary restaurant owner account created), from dashboard app for new restaurants a setup process should be done such as setting up tables and later when menu implemented the menu info-very detailed no need explanation or implementation right now, so it should be step by step setup process, as simple as possible, each table assigned a QR which can be easily downloaded or directly printed. Create/edit/delete operations are not frequent, mostly setup once in the beginning and very rare edit, so UI should be designed accordingly. UI design is so important, dashboard app is for restaurant staff, admin app is for basically me"

This feature spans three audiences: the **platform admin** (a single internal operator — "me") who registers restaurants in the admin app and can also manage any restaurant's contents through a plain, functional management view; **restaurant staff** who, in the dashboard app (desktop-first), run a one-time guided setup for their restaurant — defining **floors → areas → tables** (menu in a future step) — arrange tables on a **visual floor-plan canvas**, obtain printable QR codes, and decide when to go live; and **customers** who, in the customer app (mobile-first), scan a table's QR code and — only when the restaurant is live — see the menu (a placeholder for now).

Tables are organized two levels deep: a restaurant has one or more **floors**, each floor has one or more **areas**, and each table belongs to exactly one area. This structure powers a visual floor-plan canvas now and waiter-routing / floor-scoped screens later.

A guiding principle throughout: **create/edit/delete happen rarely** — typically once at onboarding, with occasional edits afterward. The experience is optimized for an infrequent, possibly first-time user who needs clarity and guidance, **not** for a power user doing high-volume data entry. Dashboard staff may be of any age (adult, middle-aged, or older), so the dashboard must be genuinely accessible.

## Clarifications

### Session 2026-06-05

- Q: When staff skip onboarding or a table QR exists mid-setup, what controls whether a customer can see the menu? → A: Visibility is an explicit, staff-controlled **"Go live"** action that defaults **OFF**. A restaurant is created `inactive`; nothing (creating/printing a QR, partially or fully finishing onboarding) auto-activates it. A scanned table QR shows the menu **only when the restaurant is `active` AND the scanned table exists**; otherwise the customer sees a friendly "not available yet" page even if the QR was already printed.
- Q: What does a customer see at a restaurant's subdomain **root** (no table context)? → A: A minimal branded landing that says "Scan the QR code on your table to view the menu." (No menu shown without a table.) Shows "not available" if the restaurant is inactive.
- Q: How should "skip onboarding" behave so staff don't skip it by accident? → A: Skipping is a deliberate action with a proper warning and confirmation — never an instant or single-misclick skip. If ≥1 table exists, the confirmation offers "Go live now?" defaulting to **No**; with no tables, staff simply land in the dashboard. The restaurant stays `inactive` either way.
- Q: What accessibility bar applies to the dashboard, given staff may be older? → A: **WCAG 2.2 level AA**, plus concrete minimums: interactive targets ≥44px, base text ≥16px, high-contrast text, no time-limited interactions, and plain-language Turkish labels.
- Q: Is the customer app in scope, and what does it show now? → A: In scope but intentionally **simple**. Customer app is **mobile-first**, accessed via the restaurant **subdomain**, reached by scanning a table QR; on a live, valid restaurant+table it shows a **placeholder menu** (real menu is future work). Dashboard app is **desktop-first**.
- Q: Are multiple customers sharing one table (join/split) in scope? → A: **Future only.** Later, multiple customers (e.g., a family) may join the same table's session, and split-payment arrives with payments. For now the table is simply the anchor a customer's QR resolves to; no sessions, identity, or joining are built.
- Q: How are tables organized, and how unique are floor/area names? → A: A **two-level hierarchy** — restaurant → **Floor** → **Area** → **Table**; each table belongs to exactly one area. **Floor** names are unique within a restaurant; **Area** names are unique within their floor (the same area name may repeat on different floors). A default floor and a default area are auto-created so a single-section venue can add tables without ever defining floors/areas. Floors and areas are defined during onboarding and editable later.
- Q: Is the visual floor-plan canvas in scope, and is it editable now? → A: **In scope now, and editable now.** Each floor has a visual canvas where staff position that floor's tables via drag-and-drop; positions persist. Until a floor is arranged it renders a sensible default layout (all tables shown equally), so arranging is never required to use the system or to go live, and onboarding never forces it. The canvas is **always available** (no enable/disable toggle). QR links are independent of canvas position. (Premium/plan gating of the canvas, and role-based authorization of *who* may edit it, are deferred to when auth/plans exist.)
- Q: How does pagination apply across the apps? → A: **Every list endpoint supports pagination** (page-based) as a defensive bound — no list can be made unbounded by, e.g., spamming thousands of areas or tables — but **page sizes are tuned per surface and the pagination control is shown only when there is more than one page**. The **admin restaurant list** uses a small page size (~20), so its pager appears early. **Tables, floors, and areas use a generous page size** (e.g., ~200) so a normal venue's complete set fits on a single page and no pager is shown (a 30-table venue shows all 30); only pathological/abusive volumes ever spill onto a second page. The visual canvas operates on the loaded page of a floor's tables.
- Q: Can the admin manage a restaurant's contents, not just register/edit it? → A: **Yes.** The admin app provides a plain, functional management view for any restaurant — managing its floors, areas, tables, and toggling active/inactive (go-live rules still apply) — reusing the same validation and confirmation rules as the dashboard, but **without** the guided wizard or the visual canvas (those remain the staff-dashboard experience).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin registers a new restaurant (Priority: P1)

As the platform admin, I register a new restaurant so it exists in the system and its staff can begin setting it up. I give the restaurant a display name; a URL slug is suggested automatically from the name and I can adjust it. The slug must be unique. A newly registered restaurant is created **inactive** (not visible to customers) and stays that way until its staff explicitly take it live.

**Why this priority**: Nothing else can happen until a restaurant record exists. This is the entry point of the entire flow and is independently valuable: the admin can populate the platform with restaurants even before any setup or QR work exists.

**Independent Test**: From the admin app, create a restaurant with a name and confirm it appears in the restaurant list as `inactive` with a unique slug. Attempting a duplicate slug is rejected with a clear message.

**Acceptance Scenarios**:

1. **Given** the admin is in the admin app, **When** they submit a new restaurant with a valid name, **Then** the restaurant is created `inactive`, a slug is derived from the name, and it appears in the list.
2. **Given** a restaurant with slug `acme` already exists, **When** the admin tries to create another with slug `acme`, **Then** creation is rejected with a clear, distinct "slug already taken" message in the admin's language.
3. **Given** the admin is reviewing the restaurant list, **When** they view any entry, **Then** they can see its name, slug, and current status (`active`/`inactive`) at a glance.

---

### User Story 2 - Staff complete guided setup and decide when to go live (Priority: P1)

As restaurant staff, the first time I open my restaurant's dashboard I am guided through a simple, step-by-step setup. I define my physical layout — **floors** and the **areas** within them — and then add my **tables**, each assigned to an area with a short label (e.g., a number or name); I can add several tables quickly. A default floor and default area are already there, so if I have a single section I just add tables and never think about floors/areas. I can choose to **leave/skip** the guided setup, but that is a deliberate, clearly-warned action — not something I trigger by a single misclick. My restaurant does **not** go live automatically; taking it live is an explicit choice I make (and is only possible once I have at least one table). I can leave partway through and resume later without losing what I entered.

**Why this priority**: This is the core of the feature — it turns an empty restaurant record into a usable restaurant that staff can take live. It is independently testable and demonstrable on its own (tables can be created, the restaurant taken live) even before QR download or the customer app exist.

**Independent Test**: Open a freshly registered restaurant in the dashboard, follow the guided steps to add a few tables with unique labels, take the restaurant live, and confirm its status flips to `active`. Re-entering shows the management view, not the wizard. Separately, confirm that attempting to skip onboarding shows a warning/confirmation rather than skipping instantly.

**Acceptance Scenarios**:

1. **Given** a newly registered (`inactive`) restaurant with no tables, **When** staff open its dashboard, **Then** they are presented with a guided setup that shows the steps, where they are, and what to do next — not a blank management screen.
2. **Given** staff are on the tables step, **When** they add a table with a label, **Then** the table is saved (assigned to the selected or default area) and shown in the list of tables for that restaurant.
3. **Given** staff try to add a table with a label that already exists for this restaurant, **When** they submit, **Then** it is rejected with a clear "label already used" message.
4. **Given** staff have added at least one table, **When** they choose "Go live", **Then** the restaurant becomes `active` (customer-visible) and setup is marked complete.
5. **Given** a restaurant with zero tables, **When** staff look for a way to go live, **Then** "Go live" is unavailable with guidance to add at least one table first.
6. **Given** staff choose to leave/skip onboarding, **When** they trigger it, **Then** they receive a clear warning and must confirm (no instant skip); if ≥1 table exists they are offered "Go live now?" defaulting to **No**, and on confirming they land in the dashboard with the restaurant still `inactive`.
7. **Given** staff partially completed setup and left, **When** they return, **Then** their previously entered tables and progress are preserved and they can continue.
8. **Given** a restaurant with a multi-floor/multi-section layout, **When** staff define floors and the areas within them, **Then** each floor name is unique within the restaurant, each area name is unique within its floor, and subsequently added tables can be assigned to those areas.
9. **Given** a single-section venue, **When** staff start setup, **Then** a default floor and area already exist and staff can add tables immediately without defining any floors or areas.

---

### User Story 3 - Staff download and print table QR codes (Priority: P2)

As restaurant staff, each of my tables has its own QR code. I can download a single table's code, download all codes for the restaurant at once, and print them directly in a layout that pairs each code with its table label, so I can place the right code on each table.

**Why this priority**: QR codes are the physical artifact that connects a table to the customer experience. They depend on tables existing (Story 2) but deliver distinct, demonstrable value: staff walk away with printable codes. Printing can happen before the restaurant is live (codes are physical and reusable); the codes only *resolve* to a menu once the restaurant is live.

**Independent Test**: Given a restaurant with several tables, download one table's QR as a file, download all tables' codes in a single action, and trigger a print view that shows each code labeled with its table.

**Acceptance Scenarios**:

1. **Given** a restaurant with tables, **When** staff request a single table's QR code, **Then** they receive a downloadable image/file for that table.
2. **Given** a restaurant with multiple tables, **When** staff choose "download all" or "print all", **Then** they receive/print all codes in one action, each clearly labeled with its table.
3. **Given** a table is renamed, **When** staff reprint, **Then** the underlying QR link is unchanged so previously printed codes still work (renaming does not force a reprint).

---

### User Story 4 - Customer scans a table QR and sees the menu (Priority: P2)

As a customer seated at a table, I scan the QR code on the table with my phone. If the restaurant is live and the table is valid, I land on the restaurant's mobile customer app (on its subdomain) and see the menu — which is a simple placeholder for now. If the restaurant is not live yet, or the code/table is not valid, I see a friendly "not available" message instead of a broken page.

**Why this priority**: This is the payoff of the QR codes and the reason the table model exists. It is intentionally minimal now (placeholder menu) but must exist end-to-end so a scanned code does something sensible. It depends on tables/QRs (Stories 2–3) and on the restaurant being live.

**Independent Test**: With a live restaurant that has tables, scan/open a table's QR link on a phone and confirm the placeholder menu appears scoped to that table. Repeat against an `inactive` restaurant and confirm a clear "not available yet" page appears instead. Open the subdomain root (no table) and confirm the "scan your table's QR" landing.

**Acceptance Scenarios**:

1. **Given** a live restaurant and a valid table, **When** a customer scans that table's QR, **Then** they see the restaurant's (placeholder) menu on a mobile-friendly page scoped to that table.
2. **Given** an `inactive` restaurant (e.g., mid-onboarding or skipped), **When** a customer scans a table's QR, **Then** they see a friendly "not available yet" page and **not** the menu — even though the QR was printed.
3. **Given** an unknown restaurant slug or a table that no longer exists, **When** a customer opens the link, **Then** they see a clear not-found/not-available result.
4. **Given** a customer opens the restaurant subdomain **root** with no table context, **When** the page loads, **Then** they see a minimal branded landing instructing them to scan the QR on their table (or "not available" if the restaurant is inactive).

---

### User Story 5 - Staff make rare edits and manage go-live after setup (Priority: P3)

As restaurant staff, occasionally (rarely) I need to add a new table, rename one, or remove one after initial setup, adjust my floors and areas, re-download/reprint affected QR codes, and toggle my restaurant between live and not-live — without going through the whole guided wizard again. The management view for this is simple and clear because I use it infrequently.

**Why this priority**: Edits and re-toggling live status are explicitly rare; they round out the lifecycle but the restaurant is already usable without them. Lowest-priority staff journey.

**Independent Test**: For a set-up restaurant, add one table, rename another, remove a third from a management view (not the wizard); toggle the restaurant off and back on; confirm changes persist, the removed table's code is invalidated, and remaining codes still download/print correctly.

**Acceptance Scenarios**:

1. **Given** a set-up restaurant, **When** staff open table management, **Then** they see all of the restaurant's tables at once (not capped by pagination) in a clear, low-density view with obvious add/edit/remove actions, floor/area organization, and a live/not-live control.
2. **Given** staff remove a table, **When** they confirm the (clearly warned) removal, **Then** the table and its QR code are removed and previously printed codes for it no longer resolve.
3. **Given** staff add a table after setup, **When** they save it, **Then** it immediately has its own QR code available to download/print, with no re-run of the full setup.
4. **Given** a live restaurant, **When** staff toggle it to not-live, **Then** scanning any of its table QRs shows "not available" until they take it live again.

---

### User Story 6 - Admin edits, deactivates, or removes a restaurant (Priority: P3)

As the platform admin, I occasionally need to correct a restaurant's name or slug, deactivate/reactivate it (oversight/suspension), or remove it entirely. These are rare actions and are protected by confirmation, especially when they would break existing links.

**Why this priority**: Maintenance action that is infrequent and not required for the core onboarding value; included for lifecycle completeness.

**Acceptance Scenarios**:

1. **Given** an existing restaurant, **When** the admin edits its name and/or slug to valid, unique values, **Then** the changes are saved.
2. **Given** a live restaurant, **When** the admin changes its slug, **Then** the admin is warned that existing links/QR destinations tied to the old slug may break before confirming.
3. **Given** a live restaurant, **When** the admin deactivates it, **Then** it stops being customer-visible (scans show "not available") until reactivated.
4. **Given** a restaurant with tables, **When** the admin removes the restaurant, **Then** a confirmation clearly states the consequences (tables and QR codes become invalid) before deletion proceeds.
5. **Given** any restaurant, **When** the admin opens its management view, **Then** they can manage its floors, areas, and tables and toggle active/inactive using the same rules as staff, in a plain functional UI (no guided wizard, no visual canvas).

---

### User Story 7 - Staff arrange tables on the visual floor-plan canvas (Priority: P2)

As restaurant staff, I can open a visual floor-plan canvas for each floor and drag my tables into the positions that match the physical room (near the window, by the balcony, etc.). The arrangement is saved and shown whenever I return. I am never forced to arrange the canvas — before I touch it, the floor shows a sensible default layout with all its tables laid out equally — and arranging it is not required to finish setup or to go live. The canvas is always available.

**Why this priority**: The canvas makes the floor/area structure tangible and is the foundation for future waiter routing and floor-scoped screens, but the restaurant is fully usable (set up, live, QR codes working) without anyone arranging it. So it is valuable and in scope now, yet not part of the critical go-live path.

**Independent Test**: For a restaurant with multiple tables across areas, open a floor's canvas, drag tables to new positions, reload, and confirm positions persist; confirm an un-arranged floor shows all its tables in a default equal layout; confirm moving a table does not change its QR.

**Acceptance Scenarios**:

1. **Given** a floor with tables that has never been arranged, **When** staff open its canvas, **Then** all of that floor's tables appear in a sensible default layout (ordered equally), grouped by area.
2. **Given** the canvas is open, **When** staff drag a table to a new position and the change is saved, **Then** reopening the canvas shows the table in that position.
3. **Given** a table has been positioned on the canvas, **When** staff (or the admin) rename or re-print it, **Then** its QR link is unchanged — canvas position never affects table identity or its QR.
4. **Given** a restaurant still mid-onboarding, **When** staff have not arranged any canvas, **Then** they can still finish setup and go live; arranging the canvas is never required.

---

### Edge Cases

- **Duplicate slug** on restaurant create or edit → rejected with a distinct, localized "slug already taken" message (not a generic error).
- **Duplicate table label** within a restaurant → rejected; labels are unique per restaurant (the same label may exist in a different restaurant).
- **Trying to go live with zero tables** → "Go live" is unavailable, with guidance to add at least one table first.
- **QR printed/scanned during onboarding** → because the restaurant is still `inactive`, scanning shows the "not available yet" page, never the menu.
- **Skip/leave onboarding** → always a warned, confirmed action; a single misclick never skips. Default on the offered "Go live now?" is No.
- **Abandoned setup** → entered tables and step progress are saved; staff resume where they left off rather than restarting.
- **Slug change after go-live** → warns that old subdomain/links and any printed QR destinations tied to the old slug may stop working.
- **Renaming a table** → the QR link is bound to a stable table identity, not the label, so renaming never breaks an already-printed code.
- **Removing a table with codes already printed** → clear warning that physical/printed codes for that table will stop working.
- **Customer reaches an inactive or not-yet-set-up restaurant** → sees a "not available yet" page; staff can still access the dashboard for it.
- **Customer opens subdomain root (no table)** → sees the "scan your table's QR" landing (or "not available" if inactive).
- **Large restaurant** (e.g., 150+ tables) → bulk download and print of all QR codes still completes in a single action and remains usable.
- **Empty or invalid restaurant name** → blocked with inline validation before submission.
- **Single-section venue** → a default floor and area are pre-created; staff add tables without ever touching floors/areas.
- **Duplicate floor name** within a restaurant, or **duplicate area name** within the same floor → rejected with a clear localized message; the same area name on a *different* floor is allowed.
- **Removing a floor that still has areas, or an area that still has tables** → a clearly-warned confirmation; the system prevents orphaning tables (removal is blocked until the floor/area is emptied, or its tables are reassigned).
- **Table not yet positioned on the canvas** → it appears in the floor's default equal layout; arranging is optional.
- **Two staff edit the same canvas concurrently** (no auth/identity yet) → last write wins; richer conflict handling arrives with auth/real-time (out of scope now).
- **Abusive/runaway counts** (e.g., thousands of areas or tables) → every list is paginated as a defensive bound; normal volumes stay on a single page with no pager shown, so the guard is invisible until it is needed.

## Requirements *(mandatory)*

### Functional Requirements

**Admin — restaurant registration & management**

- **FR-001**: The admin app MUST let the platform admin create a restaurant by providing a display name.
- **FR-002**: The system MUST suggest a URL slug derived from the name and allow the admin to override it; the slug MUST be unique across all restaurants.
- **FR-003**: The system MUST reject a duplicate slug with a distinct, localized message separate from generic validation errors.
- **FR-004**: A newly created restaurant MUST start `inactive` (not visible to customers).
- **FR-005**: The admin app MUST present a list of all restaurants showing, at minimum, name, slug, and current status (`active`/`inactive`).
- **FR-006**: The admin MUST be able to edit an existing restaurant's name and slug, subject to the same uniqueness rule (FR-002/FR-003).
- **FR-007**: The admin MUST be able to deactivate and reactivate a restaurant, and to remove it entirely; removal MUST require a confirmation stating the consequences (its tables and QR codes become invalid).
- **FR-008**: When the admin changes the slug of a live restaurant, the system MUST warn that existing links/QR destinations tied to the old slug may break before the change is confirmed.

**Dashboard — guided setup (tables) & go-live**

- **FR-009**: When staff open a restaurant that has not yet completed guided setup, the dashboard MUST present a guided, step-by-step setup flow rather than a blank management screen.
- **FR-010**: The setup flow MUST present one step at a time, indicate overall progress and the current step, and allow moving forward and back between steps.
- **FR-011**: The setup flow MUST include a floors & areas step and a tables step where staff define the restaurant's physical layout and tables; it MUST be structured to accommodate additional future steps (e.g., menu) without redesign.
- **FR-012**: Staff MUST be able to add a table with a short label assigned to an area (defaulting to the sole/default area when only one exists); labels MUST be unique within the restaurant.
- **FR-013**: Staff MUST be able to add multiple tables quickly during setup (e.g., a quick "add N tables" affordance), consistent with the "set up once, fast" goal.
- **FR-014**: The system MUST persist partially completed setup so staff can leave and resume without losing entered tables or progress.
- **FR-015**: Staff MUST be able to leave/skip the guided setup, but only via a deliberate action that shows a clear warning and requires explicit confirmation; a single misclick MUST NOT skip. The skip affordance MUST be present but not visually dominant.
- **FR-016**: A restaurant MUST NOT become customer-visible automatically; it becomes `active` only through an explicit staff "Go live" action.
- **FR-017**: The "Go live" action MUST be available only when the restaurant has at least one table; otherwise it MUST be disabled with guidance to add a table first.
- **FR-018**: When staff skip onboarding with at least one table present, the system MUST offer a "Go live now?" choice defaulting to **No**; the restaurant remains `inactive` unless staff explicitly opt in.
- **FR-019**: After guided setup is completed or skipped, re-entering the dashboard MUST show a management view rather than forcing staff back through the wizard.
- **FR-020**: Staff MUST be able to toggle a restaurant between `active` and `inactive` from the management view at any time (subject to FR-017).

**Table QR codes**

- **FR-021**: The system MUST assign every table a QR code that encodes a stable link resolving to that specific table's customer experience on the restaurant's subdomain.
- **FR-022**: The QR link MUST be bound to a stable table identity (not the table's label), so renaming a table does not change or break its QR code.
- **FR-023**: Staff MUST be able to download an individual table's QR code as a printable image/file.
- **FR-024**: Staff MUST be able to download or print all of a restaurant's QR codes in a single action, with each code clearly labeled with its table.
- **FR-025**: The print output MUST be print-friendly and pair each code with its table label so staff can place the correct code on each table.
- **FR-026**: Removing a table MUST remove/invalidate its QR code so the link no longer resolves, with staff warned beforehand that printed copies will stop working.

**Customer — scan & view (mobile-first, simple)**

- **FR-027**: The customer app MUST be mobile-first and reached via the restaurant's subdomain when a customer scans a table QR.
- **FR-028**: When a customer scans a valid table QR of an `active` restaurant, the system MUST show a menu view (a placeholder is acceptable now) scoped to that table.
- **FR-029**: When the restaurant is `inactive`, or the table/restaurant is unknown, the system MUST show a clear, friendly "not available yet" / not-found page and MUST NOT show the menu — even if the QR was previously printed.
- **FR-030**: At a restaurant subdomain root with no table context, the system MUST show a minimal branded landing instructing the customer to scan the QR on their table (or "not available" if the restaurant is `inactive`).

**Post-setup table management (rare edits)**

- **FR-031**: After setup, staff MUST be able to add, rename, and remove tables from a simple management view without re-running the full setup wizard.
- **FR-032**: A table added after setup MUST immediately have a downloadable/printable QR code, identical in behavior to tables created during setup.

**Cross-cutting UX, accessibility & validation**

- **FR-033**: Both staff- and admin-facing apps MUST present clear, low-density interfaces optimized for infrequent (often first-time) use: primary actions obvious, guidance present, minimal clutter.
- **FR-034**: The dashboard app MUST be desktop-first; the customer app MUST be mobile-first.
- **FR-035**: The dashboard MUST meet WCAG 2.2 level AA and these minimums: interactive targets ≥44px, base text ≥16px, high-contrast text, no time-limited interactions, and plain-language Turkish labels.
- **FR-036**: All destructive or consequential actions (remove restaurant, remove table, breaking slug change, deactivating a live restaurant, skipping onboarding) MUST require explicit confirmation that states the consequence.
- **FR-037**: Forms MUST validate input inline and present errors in the user's language (Turkish for both staff and admin, per existing localization).

**Floors & areas (layout structure)**

- **FR-038**: The system MUST organize tables under a two-level hierarchy — each restaurant has one or more floors, each floor has one or more areas, and each table belongs to exactly one area.
- **FR-039**: On restaurant creation (or first setup), the system MUST auto-provision a default floor and a default area so a single-section venue can add tables without manually defining any floors or areas.
- **FR-040**: Staff MUST be able to add, rename, reorder, and remove floors and areas during setup and later from management. Floor names MUST be unique within a restaurant; area names MUST be unique within their floor.
- **FR-041**: Removing a floor that still contains areas, or an area that still contains tables, MUST require a confirmation stating the consequence and MUST NOT orphan tables (removal is blocked until emptied, or tables are reassigned).

**Visual floor-plan canvas**

- **FR-042**: The dashboard MUST provide a visual floor-plan canvas per floor where staff can position that floor's tables via drag-and-drop, and the positions MUST persist.
- **FR-043**: Before a floor has been arranged, its canvas MUST render a sensible default layout showing all of the floor's tables laid out equally; arranging the canvas MUST NOT be required to complete setup or to go live.
- **FR-044**: The visual canvas MUST always be available (no enable/disable toggle); plan/premium gating of the canvas and role-based authorization of who may edit it are deferred (future, with auth/plans).
- **FR-045**: A table's identity and QR link MUST be independent of its canvas position; moving a table on the canvas MUST NOT change or break its QR.

**Pagination & admin management**

- **FR-046**: Every list (restaurants, tables, floors, areas) MUST support page-based pagination as a defensive bound so no list can grow unbounded; the pagination control MUST be shown only when there is more than one page.
- **FR-047**: Page sizes MUST be tuned per surface: the admin restaurant list uses a small page size (~20); tables, floors, and areas use a generous page size (e.g., ~200) so a normal venue's complete set fits on one page with no pager shown.
- **FR-048**: The admin app MUST provide a plain, functional management view for any restaurant — managing its floors, areas, and tables and toggling active/inactive — reusing the same validation, uniqueness, and confirmation rules as the dashboard, but without the guided wizard or the visual canvas.

### Key Entities *(include if feature involves data)*

- **Restaurant**: A tenant on the platform. Key attributes: display name, unique slug, status (`active`/`inactive`, default `inactive` on creation), and whether guided setup has been completed. Going `active` is an explicit staff action ("Go live"), allowed only with ≥1 table. Owns its floors (and through them, its areas and tables).
- **Floor**: A level within a restaurant (e.g., "Zemin Kat", "1. Kat"). Key attributes: name unique within the restaurant, display order. A default floor is auto-created. Owns areas and has one visual canvas. Belongs to exactly one restaurant.
- **Area**: A section/zone within a floor (e.g., "Bahçe", "Pencere kenarı"). Key attributes: name unique within its floor, display order. A default area is auto-created on the default floor. Groups tables. Belongs to exactly one floor.
- **Table**: A physical table within one area. Key attributes: a stable internal identity (used by its QR link), a human-facing label unique within the restaurant, optional seating capacity, and an optional canvas position (coordinates on its floor's plan). Belongs to exactly one area (hence one floor and restaurant). (Future: serves as the anchor for a multi-customer table session.)
- **Visual floor-plan canvas**: A per-floor 2D arrangement of that floor's tables. Persists each table's position; renders a default equal layout for any floor not yet arranged; always available. Position data is presentation-only and never affects a table's identity or QR.
- **Table QR Code**: The scannable code for a table, derived from the table's stable identity. Encodes a per-table link into the customer app on the restaurant's subdomain; renderable as a downloadable image and in a print-friendly layout labeled with the table.
- **Setup progress**: The state of a restaurant's guided onboarding — which steps are done (floors/areas and tables today; menu in future), whether setup was completed or skipped, and whether the restaurant has been taken live. Determines whether staff see the wizard or the management view.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The admin can register a new restaurant in under 1 minute from opening the admin app.
- **SC-002**: A staff member with no prior training can complete table setup for a 20-table restaurant and take it live in under 10 minutes on their first attempt.
- **SC-003**: Staff can download or print all QR codes for a restaurant in a single action (no more than 2 interactions).
- **SC-004**: At least 90% of staff complete the guided setup on the first attempt without needing help from the platform admin.
- **SC-005**: 100% of generated table QR codes, when printed and the restaurant is live, successfully open the correct table's menu view on a typical phone camera.
- **SC-006**: Renaming a table requires zero QR reprints — previously printed codes for that table continue to work.
- **SC-007**: No customer ever sees a menu for a restaurant that is not live: 100% of scans against an inactive/not-set-up restaurant show the "not available yet" page (never the menu, never a broken page).
- **SC-008**: A staff member never skips onboarding by accident: skipping always requires passing through a warning/confirmation step.
- **SC-009**: The dashboard passes a WCAG 2.2 AA audit, and all interactive targets are ≥44px with base text ≥16px.
- **SC-010**: Scanning a valid table QR of a live restaurant opens the (placeholder) menu on a typical phone in under 3 seconds.
- **SC-011**: Setup progress survives interruption: a staff member who closes the app mid-setup loses none of the tables they had already added.
- **SC-012**: A staff member can arrange a floor's tables on the visual canvas and the positions persist across reloads and sessions (100% of saved positions are restored).
- **SC-013**: A restaurant with 30+ tables shows all of them at once in the dashboard and admin management — no table is hidden behind a pager at normal volumes.
- **SC-014**: The admin restaurant list stays usable as restaurants grow: a page loads in under 1 second with hundreds of restaurants, and the pager appears only when more than one page exists.
- **SC-015**: No list can be made unbounded: even thousands of areas or tables remain navigable (paginated) without breaking the page.

## Assumptions

- **Authentication is not yet implemented.** There are no per-user accounts today; anyone able to reach a restaurant's dashboard can perform its setup. The "temporary restaurant owner account" provisioned when the admin creates a restaurant is **deferred until auth lands** — out of scope here, but registration and setup are designed so it can be added later without rework.
- **Menu is a future step.** This feature implements only the tables step, QR codes, and a placeholder customer menu view; the guided flow is structured so a detailed menu step can be added later without redesigning the wizard.
- **Visibility model.** A restaurant is created `inactive` and becomes customer-visible only through an explicit staff "Go live" action (default off), which requires ≥1 table. This maps onto the platform's existing active/inactive restaurant status (customers already only reach active restaurants); the new behavior is that creation defaults to `inactive` and going live is a deliberate choice, not an automatic consequence of having tables or finishing setup.
- **Customer entry is the table QR on a subdomain.** Each table's QR encodes a stable per-table link into the mobile-first customer app on the restaurant's subdomain. On a live restaurant it shows a placeholder menu scoped to the table; otherwise it shows "not available."
- **Platform targets.** Dashboard app is desktop-first; customer app is mobile-first; admin app is used by a single internal operator.
- **Localization.** Staff- and admin-facing strings are Turkish, using the platform's existing localization; no additional languages are in scope.
- **Table attributes are minimal.** A table requires only a unique label and an area (which defaults to the auto-created area, so staff need not choose one for a single-section venue); seating capacity and canvas position are optional and not required to finish setup or go live.
- **Floors and areas have sensible defaults.** A restaurant always has at least one floor and one area; defaults are auto-created so the simplest venues never interact with the hierarchy, while multi-floor venues opt into it.
- **The visual canvas is built now and editable now,** but its plan/premium gating and role-based authorization of *who* may edit it are deferred until plans and auth exist. With no auth yet, concurrent canvas edits resolve last-write-wins.
- **Admin management mirrors staff capabilities functionally.** The admin can manage any restaurant's floors/areas/tables and live status with a plain UI, deliberately without the guided wizard or the visual canvas, which remain the staff-dashboard experience.
- **Pagination is defensive and mostly invisible.** All lists are paginated to bound abuse, but page sizes are tuned so normal volumes fit on one page and the pager is hidden unless there is more than one page.
- **The floor/area model anticipates waiter features.** Waiter service-requests handled in the dashboard, waiter routing, and floor-scoped screens are future work; the floor → area → table hierarchy and canvas are built so they can be added without restructuring.

### Out of Scope

- Authentication, user accounts, and owner-account provisioning (deferred to a future auth feature).
- Menu modeling and menu setup UI (the customer menu is a placeholder now), ordering, and payments.
- **Multi-customer table sessions** — multiple customers joining one table's session, and **split payment**, arrive later with payments; the table is only the future anchor for this, nothing is built now.
- **Non-subdomain / apex access** — a future page where a customer opens their camera to scan a QR, with possible GPS "nearest restaurant" discovery, is an idea only and out of scope.
- **Plan/premium gating of the visual canvas** and **role-based authorization of who may edit it** — deferred until subscription plans and authentication exist; the canvas itself ships now, always available and editable.
- **Waiter features** — in-dashboard waiter service-requests, waiter routing, and floor-scoped multi-screen views are future work (they require auth); the floor/area/canvas model is built to support them but none are built now.
- Analytics, reporting, and multi-language support beyond existing Turkish.
