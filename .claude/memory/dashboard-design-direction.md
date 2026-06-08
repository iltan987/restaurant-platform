---
name: dashboard-design-direction
description: "Visual design language for the dashboard — indigo accent, light+dark, onboarding wizard shape; project name still TBD"
metadata: 
  node_type: memory
  type: project
  originSessionId: ceb32b70-f793-41e8-82c5-c2085682a238
---

The dashboard UI follows a design mocked in Claude Design (a full restaurant POS concept). We adopt its **setup/onboarding** language for feature 002; its POS/billing/floor-plan parts map to later stories.

- **No project name yet.** The mock used a placeholder name that is already taken by another product — never reuse that name anywhere (code, copy, or git). The user will choose a real name later.
- **Accent:** indigo-violet (`--primary` ≈ `oklch(0.457 0.24 277)`), applied in `packages/ui/src/styles/globals.css` for **both** `:root` and `.dark`. `--ring` is tied to the accent. Fonts already match the mock (Geist / Geist Mono).
- **Light + dark are required** and already wired (shadcn tokens + `next-themes`, `.dark` class, "press D" hotkey). Shared [[`ThemeToggle`]] lives at `@repo/ui/components/theme-toggle` (it is our own component, not a shadcn primitive, so it sits in `components/`, not `components/ui/`).
- **Onboarding wizard** (`apps/dashboard/features/restaurants/components/setup-wizard.tsx`): full-screen, left rail stepper, steps Katlar → Bölgeler → Masalar → Yayına Al. Choice cards, editable list rows, suggestion chips, count steppers, summary tiles. Reused step components render `embedded` in the management view.
- **Creation split:** the **admin** app creates a restaurant with only basic info (name); floors/areas/tables/go-live happen in the **dashboard** onboarding. Backend may gain more profile fields (city/logo) later — not now. See [[single-floor-hides-floor-ui]].
- Build with our stack (Tailwind v4 + shadcn `base-nova`/Base UI), mapping the mock's CSS tokens to our semantic tokens (`bg-card`, `text-muted-foreground`, `bg-primary/10`, etc.) — don't copy the prototype's raw CSS.
