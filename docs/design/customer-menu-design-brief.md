# Customer Menu — Design Brief

**For:** Product/UX designer
**Surface:** Customer app (mobile-first, web — opened by scanning a table QR)
**Date:** 2026-06-10
**Status:** Ready for design

---

## 1. Context

We're building a multi-tenant QR-menu platform for restaurants in Turkey. A diner sits at a
table, scans the table's QR code with their **own phone**, and lands on that restaurant's menu in
a **mobile web browser** (no app install). This brief covers the **menu-browsing experience** the
diner sees.

- **Primary user:** a seated diner, on their own phone, on cellular, possibly a low-end Android.
- **Language:** **Turkish only** (copy, labels, currency, time).
- **Context of use:** at the table, often deciding what to order, sometimes just curious.
- **No login** in this phase — the menu is public per restaurant (guest browsing).

### Design feel — "warm it up" (decided)

There is an existing shared component system (Tailwind v4 + Base UI/shadcn, **indigo accent**,
**light + dark mode**) used by the internal dashboard. The customer app **reuses those same color
tokens and primitives** — we are **not** spinning up a second design system — but it should feel
**warmer and more appetite-driven** than the utilitarian dashboard:

- Keep the indigo tokens, and **add a warm appetite accent** (think a warm secondary used for
  highlights, prices, primary actions) layered on top.
- **Softer typography** and more generous spacing than the dashboard.
- Both **light + dark** still required.

The bar: clearly the same product family as the dashboard, but a surface a diner enjoys looking
at. Extend the system, don't fork it.

---

## 2. Scope

### Design & build now — read-only menu

The diner can **browse**, **search**, and **view item details**. They cannot order yet.

### Design-aware, built later — self-ordering

We will soon add self-ordering (configure an item → add to cart → place order). **Design the
read-only menu so this slots in without reworking the visual language.** Specifically, anticipate:

- item options becoming **interactive** (choose a size, add/remove ingredients, pick extras),
- **quantity** steppers, a **"Sepete Ekle"** primary action, and a **cart / running order** surface.

You don't need to fully design the cart/checkout now — just leave obvious, consistent room for it
(e.g., where a sticky "add to order" bar and a cart badge would live).

### Out of scope

- Cart, checkout, payment, bill-splitting (later slices).
- Any staff/dashboard screens (handled internally, not by this brief).
- Account/login, favorites, loyalty (later).

---

## 3. Screens & flows

### 3.1 Menu home

The landing screen after scanning. Should contain:

- **Restaurant header** — name, optional logo/cover, status (it's only reachable if the
  restaurant is live).
- **Category navigation — sticky scroll-spy bar (decided).** A horizontal category bar pinned to
  the top; the menu scrolls continuously and the bar **highlights the current category** as the
  diner scrolls (and tapping a category jumps to that section). Categories are ordered (e.g.
  _Başlangıçlar, Ana Yemekler, İçecekler_). Hidden categories never appear.
- **Item list** — items grouped under their category, in the order the restaurant set.
- **Search entry point** — see 3.3.

### 3.2 Item card (in the list) — balanced photo treatment (decided)

A compact, scannable card with a **compact thumbnail per row** (not hero imagery). Because many
items will have **no photo**, the **photo-less fallback must feel intentional**, not broken — a
row without an image should read as a deliberate design state, equal in dignity to one with a
thumbnail. Shows (all but name/price are optional and may be absent):

- **Name**
- **Price** — formatted Turkish Lira (e.g. `₺120` / `₺120,00`).
- **Cover thumbnail** (first media asset) when present; intentional fallback when absent.
- **Short description** (truncated).
- **Tag chips** (e.g. _vegan, acılı, şefin önerisi_) — small, secondary.
- **Unavailability state** — out-of-stock or "not served right now" (see 3.6).

### 3.3 Search

Diners search across the **whole menu**, not within one category:

- Searches **item names** (and ideally descriptions/tags) **across all categories**.
- Also matches **category names**.
- Results update **instantly as they type** (the full menu is loaded client-side).
- Design the **empty-query**, **results**, and **no-results** states.

### 3.4 Item detail — large bottom sheet (decided)

Opened from a card as a **large bottom sheet** that slides up over the menu, so the diner keeps
their place in the list and can dismiss back into context quickly. The richest surface. Shows:

- **Media gallery** — an ordered list of **photos and occasionally short videos** (cap ~5). Needs a
  swipeable carousel with photo + video support.
- **Name, full description.**
- **Price**, and where applicable a **unit price** line, e.g. `₺120 · ₺240/kg` or `₺60/adet`
  (when the item declares a serving amount + unit).
- **Calories** (kcal) when present.
- **Allergens** — badges/warnings, e.g. _Gluten, Süt, Domates_. This set is **extensible**, so
  design for an arbitrary number, including custom ones.
- **Tags** — chips (_vegan_, _acılı_, …).
- **İçindekiler / options** — the item may carry option groups:
  - **Variant** — a _pick-one, required_ group (e.g. _Boy: Küçük / Orta / Büyük_), each choice may
    change price.
  - **Ingredients (add/remove)** — a list where some items are **included by default and
    removable** ("Soğansız") and others are **opt-in extras with a price** ("+ Mantar ₺15").
  - **Extras / modifiers** — _pick-many, optional_ add-ons with prices.

  In **read-only mode**, present these as **informative** ("İçindekiler: …", "Ekstralar mevcut").
  In your **ordering-aware** designs, show how the same content becomes **interactive controls**
  (radio for variant, checkboxes / +- toggles for ingredients & extras) with a **live price** that
  updates as choices change, plus quantity + "Sepete Ekle".

### 3.5 Availability — time-limited items

Some items are only **served during specific windows** (e.g. _Pazartesi & Cuma 15:00–16:00_, or
_kahvaltı 08:00–11:00_). Design:

- how a **currently-orderable** time-limited item is hinted ("15:00–16:00 arası servis edilir"),
- how an item **not available right now** looks (visible but clearly **not orderable**, with the
  reason / next window).

### 3.6 States to design

For every list and screen, design these — they're common in real menus:

- **Out of stock** ("tükendi") — item shown but blocked.
- **Not served now** (outside its time window).
- **No photo** fallback.
- **Empty category**, **empty search**, **no results**.
- **Loading** (skeletons) and **error / offline** (cellular drops).
- **Light and dark mode** for everything.

---

## 4. Content dictionary (what data exists per item)

So you know exactly what content the design must accommodate. All fields except **name** and
**price** are optional and frequently empty.

| Field                 | Type                                                         | Notes for design                                                      |
| --------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| name                  | text                                                         | required                                                              |
| description           | text                                                         | optional, can be long on detail screen                                |
| price                 | money (₺)                                                    | required; format as Turkish Lira                                      |
| serving amount + unit | e.g. 500 g / 1 adet / 330 ml                                 | drives a **unit-price** display line                                  |
| calories              | integer kcal                                                 | optional                                                              |
| media                 | ordered list, photo \| video, ~5 max                         | first = cover; design photo-less fallback                             |
| allergens             | list, **extensible** (incl. custom like _Domates_)           | badges; arbitrary count                                               |
| tags                  | list (_vegan, acılı…_)                                       | chips; restaurant-defined                                             |
| availability          | weekly time windows (day-of-week + time range), may be empty | "served at X", "not available now"                                    |
| option groups         | 0+ groups; each is variant / extras / ingredients            | see 3.4; some options on-by-default & removable, some opt-in & priced |
| in-stock              | boolean                                                      | out-of-stock state                                                    |

Categories: ordered, named, can be hidden. The menu is a flat **Category → Item** structure (one
implicit menu per restaurant).

---

## 5. Components to design

- Restaurant header
- Category navigation (sticky bar / jump)
- Item card (with and without photo; with unavailable states)
- Search bar + results + empty/no-results
- Item detail screen/sheet
- Media carousel (photo + video)
- Price block (with optional unit-price line)
- Allergen badge, tag chip
- Option controls — **informative** (read-only now) **and interactive** (ordering-aware):
  variant radios, ingredient add/remove, priced extras, live total
- Quantity stepper + "Sepete Ekle" + cart entry point (ordering-aware placeholders)
- Availability / "served at" / out-of-stock indicators
- Loading skeletons, error/offline state
- All of the above in **light + dark**

---

## 6. Constraints & guidance

- **Mobile-first** — design for small phones first; one-handed, thumb-reachable primary actions.
- **Performance** — assume slow cellular and low-end devices; favor light layouts, lazy media,
  skeletons. Video should not autoplay heavily.
- **Touch targets** — aim for comfortable **≥ 44 px** interactive targets (the platform's current
  baseline is a tighter 24 px AA minimum; the customer app should be more generous since real
  diners use it).
- **Accessibility** — WCAG 2.2 AA: sufficient contrast in both themes, legible type, don't rely on
  color alone for allergen/availability meaning.
- **Localization** — all copy Turkish; Turkish Lira and 24-hour time formatting; allergen/tag
  labels are data-driven (variable length).
- **Reuse** — build on the existing color tokens / primitives where it helps consistency.

---

## 7. Expected deliverables

- Mobile screens for: menu home, search, item detail, and the key states (3.6).
- Component set with states (default / unavailable / no-photo / loading), in light + dark.
- The **ordering-aware** version of item detail (interactive options + add-to-order) as a
  forward-looking layer, clearly marked "future / not built yet."
- Any spacing/type/token extensions documented if you go beyond the existing system.
- Figma (or your tool of choice) with a short walkthrough.

---

## 8. Direction decided

These were settled with the product owner — treat them as constraints, not open questions:

| Decision             | Choice                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personality          | **Warm it up** — reuse the indigo tokens, add a warm appetite accent + softer type; same product family, not a separate design system (see §1).                              |
| Item detail          | **Large bottom sheet** over the menu (§3.4).                                                                                                                                 |
| Category nav         | **Sticky scroll-spy bar** with tap-to-jump (§3.1).                                                                                                                           |
| Photo prominence     | **Balanced** — compact thumbnail per row, intentional photo-less fallback (§3.2).                                                                                            |
| Ordering-aware layer | **Include** a clearly-marked _future_ interactive version of item detail (interactive options, quantity, "Sepete Ekle", cart slot) — designed now, not built now (§2, §3.4). |

### Still yours to propose

- The exact **warm accent** hue/treatment and how prices/primary actions use it.
- The visual language of the **photo-less fallback** (the make-or-break detail given mixed photo coverage).
- Motion: how the bottom sheet and scroll-spy transitions feel.

```

```
