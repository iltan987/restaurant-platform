---
name: dashboard-redesign
description: Dashboard UI redesign (from .claude/design) — phase plan + the new design-token vocabulary to reuse
metadata: 
  node_type: memory
  type: project
  originSessionId: f2f7635f-8093-40d0-91e2-836881578eae
---

The dashboard (`apps/dashboard`) is being redesigned to the prototype in `.claude/design/` (the `app.jsx`/`screens.jsx`/`styles.css` set; the placeholder brand name in those files must never appear in code/UI — see [[no-product-name]]). Cool-neutral canvas, indigo accent (already ≈ the shared `--primary`), Geist + Geist Mono (already wired). Light theme primary, dark kept working.

Scope = **whole dashboard**, run in phases with commit approval after each (see [[work-in-phases-commit-approval]]):
1. Foundation & tokens ✅ 2. App shell & nav ✅ 3. Menu mgmt screen (focus) ✅ 4. Item editor dialog 5. Plan (Masalar & Alanlar) 6. QR 7. Management/onboarding/members 8. Polish.

**API contract change (Phase 3):** `GET /categories/:id/items` (and item reorder) now return `menuItemListSchema` = base item + `thumbnailUrl: string|null` (first PHOTO's public URL) + `tags: Tag[]`, so the management list shows real thumbnails + dietary badges without per-item detail fetches. Service helper `listByCategory` in `menu-items.service.ts`. Frontend list/reorder + their optimistic cache hooks use `MenuItemListEntry`.

**Design-token vocabulary** (added additively to `packages/ui/src/styles/globals.css`; light+dark; do NOT edit shadcn component files — user constraint, keep changes backward-compatible):
- Surfaces: `bg-canvas` (page bg), `bg-surface` (white card), `bg-surface-subtle`, `bg-surface-muted`, `bg-surface-hover`
- Ink/text: `text-ink` (primary), `text-ink-2` (secondary), `text-ink-3` (muted), `text-ink-4` (faint)
- Lines: `border-line`, `border-line-strong`, `border-line-subtle`
- Status (soft bg + readable text/dot): `success`/`warning`/`danger`/`info` → e.g. `bg-success-soft text-success`
- Brand: `text-brand`/`bg-brand` (=primary indigo) + `bg-brand-soft` (indigo tint for active nav etc.)
- Radius: `rounded-card` (13px). Shadows: `shadow-soft` < `shadow-card` < `shadow-raised` < `shadow-float` < `shadow-pop`

**New dashboard-local primitives** (`apps/dashboard/components/`): `tone-badge.tsx` (ToneBadge: tone + optional dot, wraps shadcn Badge), `empty-state.tsx` (EmptyState), `page-header.tsx` (PageHeader + SectionHeader).

UX rules for this redesign (older/less-technical users): real left-nav (Menu/Plan/QR were orphan URL-only routes), **row actions always visible** (not hover-reveal like the prototype), generous tap targets, item thumbnails in the menu list, strong empty states.
