---
name: qr-placement-card
description: "Table QR is a print-ready placement card (restaurant + QR + table/area), not a bare code; print + PNG via canvas"
metadata: 
  node_type: memory
  type: project
  originSessionId: ceb32b70-f793-41e8-82c5-c2085682a238
---

The per-table QR feature (US3) presents a **placement card**, not a bare QR — matching the design mock's `QrModal`/`downloadQrCardPng`. The card stacks: restaurant name (uppercase) → QR in a bordered box → "Menü için okutun" / "Telefon kameranızı QR koda doğrultun" → divider → table label + area. It renders on a forced-light background because it's a print artifact.

- `apps/dashboard/features/tables/qr.ts` → `tableQrUrl(slug, tableId)` builds the **customer** URL `<slug>.<NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN>/t/<tableId>` (http for localhost, https otherwise), keyed by the immutable `tableId` so renames/moves don't change the code.
- `qr-sheet.tsx` (per-table dialog): **PNG indir** composes the whole card to a 760×1000@2× canvas (`drawImage` from a hidden high-res `QRCodeCanvas`); **Yazdır** prints just the card via a throwaway hidden iframe (avoids popup blockers, prints only the card). The mock's separate "PDF indir" was dropped as redundant with print → Save-as-PDF.
- `qr-print-sheet.tsx` + route `app/s/[slug]/qr/` (rewritten to via the subdomain proxy): print-all sheet, vector `QRCodeSVG` per table, grouped ground-floor-first, `print:` utilities + `break-inside-avoid`.
- A base-nova `dialog` primitive was added to `@repo/ui` for this. Base UI `Button` rendering a `<Link>` needs `nativeButton={false}`.

Names are threaded `TablesStep → AreaBlock → TableChip → QrSheet`, so it works in both the wizard and the embedded management view. See [[dashboard-design-direction]].
