---
name: qr-menu-longterm-plan
description: Long-term roadmap and key product/architecture decisions for the QR-menu restaurant platform
metadata: 
  node_type: memory
  type: project
  originSessionId: 29fb9617-92d6-4c17-9fec-62f079b70afa
---

Long-term plan saved in-repo at `.claude/plans/main-project-qr-menu.md` (created 2026-06-04). The product is a multi-tenant QR-menu platform for restaurants in Turkey: scan table QR → view menu → order (self or waiter) → split & pay.

**Why:** The repo is foundation-only (just the `Restaurant` model + restaurant CRUD); the whole domain (menus, tables, sessions, orders, payments, auth, real-time) is greenfield. These four decisions were confirmed by the stakeholder and shape all future work.

**How to apply — confirmed decisions:**
- **Customer identity:** optional accounts. Guest-by-default via lightweight signed session token tied to a table; optional Better Auth (phone/social) sign-in for history/favorites/loyalty later.
- **Payments:** abstract `PaymentProvider` port, **iyzico adapter first** (TR-dominant; cards/3DS/installments); leave room for PayTR/Stripe.
- **Real-time:** NestJS Socket.IO gateway, rooms per `restaurant:<id>` (staff floor view) and `session:<id>` (table participants).
- **Phasing (menu-first):** P1 menu + tables + per-table QR + session-on-scan (read-only browse); P2 full table sessions + participants + staff live floor view + Better Auth staff/org roles; P3 ordering (self + waiter); P4 payments + bill splitting; P5 polish/scale (loyalty, TR/EN, analytics).

Money math in integer minor units (kuruş), centralized in `@repo/core`. Follow existing contract pattern (schema in `@repo/schemas` → `ErrorCode` → structured throw → Turkish in `@repo/i18n`); `apps/api/src/restaurants/` is the module template; `apps/admin/features/restaurants/` is the frontend feature-folder reference. SpecKit constitution is still the uncustomized template — run `speckit-constitution` before P1.
