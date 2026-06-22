# Admin Owner: Direct Assignment & Membership Suspension

**Date**: 2026-06-22 | **Status**: Approved

## Context

The admin's Devir tab currently supports one ownership flow: email invitation → owner accepts → membership created. Two capabilities are missing:

1. **Direct assignment** — admin assigns ownership without the email flow, generating a one-time temp password when the owner has no existing account.
2. **Suspend membership** — admin temporarily blocks an owner's dashboard access without destroying the membership record. Can be re-enabled without re-inviting.

## Data Model Changes

### `RestaurantMember` — two new fields

```prisma
suspended         Boolean @default(false)
directlyAssigned  Boolean @default(false)
```

- `suspended`: when `true`, `MembersService.requireMembership` throws `MEMBER_SUSPENDED`, blocking all dashboard access for that restaurant.
- `directlyAssigned`: used by the admin UI to show "Doğrudan atandı" vs "Davet kabul edildi" on the owner card.

**No changes to `RestaurantInvitation`.** The invitation table is the truth about outstanding email flows only. The member table is the truth about who owns a restaurant — including direct assignments.

### New `ErrorCode`

`MEMBER_SUSPENDED` — Turkish: `"Hesabınız bu restoran için askıya alınmıştır."`

## API Changes

All new endpoints are on `AdminInvitationsController` (already guarded by `AdminAuthGuard`).

### New endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/admin/restaurants/:restaurantId/owner` | Current owner state (member table) |
| `POST` | `/api/admin/restaurants/:restaurantId/owner/direct` | Direct assignment |
| `PATCH` | `/api/admin/restaurants/:restaurantId/owner/suspended` | Suspend / unsuspend |

**`GET /owner`** — Response:
```ts
{
  owner: {
    email: string
    suspended: boolean
    directlyAssigned: boolean
  } | null
}
```
Derives email by joining `RestaurantMember` → `DashUser`. Returns `null` when no OWNER member exists.

**`POST /owner/direct`** — Body: `{ email: string }`. Logic:
1. Find or create `DashUser` for email.
   - If new: generate a 16-char random password; mark `emailVerified: true` (direct admin assignment proves control); return password.
   - If existing: return `null` (they already have credentials).
2. Create `RestaurantMember` with `role: OWNER`, `directlyAssigned: true`. If an OWNER member already exists, throw `CONFLICT`.
3. All in a transaction.

Response: `{ tempPassword: string | null }`

**`PATCH /owner/suspended`** — Body: `{ suspended: boolean }`. Finds the OWNER member, updates `suspended`. Throws `NOT_A_MEMBER` if none exists. Response: 204.

### Modified

**`MembersService.requireMembership`** — after finding the member row, check `suspended`. If `true`, throw:
```ts
throw new ForbiddenException({
  code: ErrorCode.MEMBER_SUSPENDED,
  message: "This account has been suspended for this restaurant",
})
```

**`InvitationsService.adminRemoveOwner`** — already correct (deletes member + revokes invitation). No change needed.

### New schemas (`@repo/schemas`)

Add `restaurantOwnerSchema` and `RestaurantOwner` type for the `GET /owner` response:
```ts
export const restaurantOwnerSchema = z.object({
  email: z.string(),
  suspended: z.boolean(),
  directlyAssigned: z.boolean(),
})
export type RestaurantOwner = z.infer<typeof restaurantOwnerSchema>
```

Used by the admin's `fetchOwner` wrapper via `apiFetch`.

## Frontend Changes

### New queries/API (`features/invitations/`)

- `api.ts` — add `fetchOwner(restaurantId)`, `directAssign(restaurantId, email)`, `toggleSuspension(restaurantId, suspended)`
- `queries.ts` — add `ownerQueries.byRestaurant(restaurantId)` (no-cache, like invitations)
- `use-direct-assign.ts` — mutation; on success invalidates owner query; if `tempPassword` returned, stores it in local component state for the reveal panel
- `use-toggle-suspension.ts` — mutation; invalidates owner query on settle

### `tab-devir.tsx` — state machine

The component currently derives ownership from the invitation list. This is replaced by two separate queries:
- `useQuery(ownerQueries.byRestaurant(r.id))` → `owner` (current OWNER member or null)
- `useQuery(invitationsQueries.byRestaurant(r.id))` → pending invitation (filtered to PENDING)

Four UI states:

| State | Condition | UI |
|-------|-----------|-----|
| Loading | either query pending | spinner |
| Owner active | `owner && !owner.suspended` | Green card: email, "Davet kabul edildi" or "Doğrudan atandı", **Askıya al** + **Sahipliği kaldır** |
| Owner suspended | `owner && owner.suspended` | Amber card: email, "Erişim askıya alındı", **Erişimi aç** |
| No owner + pending invite | `!owner && pending` | Amber card (existing): email, expiry, **Yeniden gönder** + **İptal et** |
| No owner | `!owner && !pending` | Invite form with **E-posta / Doğrudan** toggle (see below) |

### Invite form toggle (no-owner state)

A two-option toggle inside the existing "no owner" card:

- **E-posta ile davet** (default): existing email form → "Sahip davet et" button.
- **Doğrudan ata**: email input → "Ata" button. On success: if `tempPassword` is non-null, show a one-time reveal panel inline:
  ```
  ┌─────────────────────────────────────────────┐
  │ Geçici şifre (bir kez gösterilir)           │
  │ [••••••••••••••••]  [Kopyala]               │
  │ Sahibe güvenli bir kanaldan iletiniz.        │
  └─────────────────────────────────────────────┘
  ```
  The panel is dismissed when the user navigates away or closes it manually. It is never re-shown.

### Devir adımları sidebar

The step tracker currently uses `!!accepted` and `!!current` from the invitation query. Update to:
- "Sahip davet edildi / atandı" step: `!!owner || !!pending`
- "Davet kabul edildi" step: `!!owner`

## Testing

1. `pnpm --filter api test` — add unit tests for `adminDirectAssign` (new user, existing user, already-owner conflict) and `adminToggleSuspension`.
2. `pnpm --filter admin typecheck` — must pass.
3. Manual dev flow:
   - Direct assign new email → temp password shown → owner card "Doğrudan atandı" → suspend → amber card → re-enable → green card
   - Direct assign existing dashboard email → no temp password → owner card appears
   - Email invite → accept in dashboard → suspend from admin → dashboard access blocked with Turkish error
