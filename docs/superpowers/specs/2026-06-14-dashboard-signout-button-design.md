# Design: Dashboard Sign-Out Button

## Summary

Add a `LogOut` icon button to the `ManagementView` sticky header so authenticated users can sign out without navigating away from the restaurant workspace.

## Placement

In `apps/dashboard/features/restaurants/components/management-view.tsx`, inside the `ml-auto flex items-center gap-2` group — immediately after `<ThemeToggle />`. Consistent ghost icon button style, same as `PasskeysDialog`.

## Behavior

- Calls `signOut()` from `@/lib/auth-client` (already used in `home.tsx`)
- After sign-out, redirects to `/giris` (the sign-in page)
- Button is an icon-only ghost button with `LogOut` icon and a tooltip label "Çıkış yap" for accessibility

## Scope

- Single file change: `management-view.tsx`
- No new components, no API changes, no schema changes
- Setup wizard out of scope (users can navigate to apex home)

## Notes

Temporary UI — a full user menu (avatar, account settings, sign-out) is the long-term home.
