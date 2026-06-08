---
name: a11y-target-size-deviation
description: "Shipped UI meets WCAG 2.2 AA (24px targets) but not the spec's stricter ≥44px goal — tracked deviation, not yet fixed"
metadata: 
  node_type: memory
  type: project
  originSessionId: ceb32b70-f793-41e8-82c5-c2085682a238
---

The onboarding feature spec (FR-035 / SC-009, clarified because "staff may be older") sets interactive targets at **≥44px**. The shipped `@repo/ui` design system uses compact sizing — `Button` defaults to `h-8` (32px), dense management chips use 16–20px icon-only buttons. That **passes WCAG 2.2 level AA** (SC 2.5.8 Target Size *Minimum* = 24px) but **not** the spec's ≥44px (which is actually AAA-level, SC 2.5.5 *Enhanced*).

The **US7 floor-plan canvas does meet ≥44px** (nodes 56px / 48px, focus-visible, keyboard drag, TR announcements) — the gap is the broader compact UI shipped across US1–US6 and approved visually each phase.

**Why:** Resolving it means either rewriting shared `Button` defaults + many already-approved components (large, risky churn against the [[minimal-diffs-no-unrelated-churn]] rule) or silently lowering a deliberate accessibility clarification. Neither is right for a polish pass, so it's a tracked deviation instead.

**How to apply:** If revisiting, the highest-value low-churn fix is expanding the hit area of icon-only buttons (QR/delete on table chips, the add buttons) to ~44px via padding while keeping the icon visually small — that targets the genuine older-staff concern without changing the compact aesthetic. Do NOT bulk-bump every button. Relates to [[dashboard-design-direction]].
