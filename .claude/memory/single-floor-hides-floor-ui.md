---
name: single-floor-hides-floor-ui
description: Dashboard hides the floor concept entirely when a restaurant has only one floor
metadata: 
  node_type: memory
  type: project
  originSessionId: ceb32b70-f793-41e8-82c5-c2085682a238
---

When a restaurant has exactly **one floor** (the auto-created default "Zemin Kat"), the dashboard UI must **not** make staff select, name, or manage floors at all — areas/tables are managed directly as if floors didn't exist. The floor dimension (floor picker, floor grouping, per-floor canvas tabs) only appears once a **second** floor is added. Mirrors the existing single-area rule (area select defaults to the sole area for single-section venues).

**Why:** Most venues are single-floor; forcing them through a floor step/selector is pointless friction. The user asked for "give the restaurant the option to just have 1 default floor, no need to enter or create anything."

**How to apply:** Backend is unchanged — the default floor always exists (created in `RestaurantsService.create`'s `$transaction`) and the floors API still supports N floors. This is purely a dashboard-UI gate: branch on `floors.length === 1`. Affects the wizard `FloorsAreasStep`/`TablesStep` (T029), the management `TableManager` (T052), and the floor-plan canvas (T046). Relates to [[work-in-phases-commit-approval]].
