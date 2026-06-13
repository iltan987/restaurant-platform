---
name: backend-on-render
description: "The NestJS API deploys to Render (persistent server), not Vercel; only the Next apps are on Vercel"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1ac5506c-e111-49a6-bc70-12b93822e557
---

The NestJS `api` deploys to **Render** as a persistent Node web service (`render.yaml` at repo root, Node 24, `node apps/api/dist/main.js`). The three Next.js apps (admin/dashboard/customer) stay on **Vercel**.

**Why:** the API is a long-lived server (raw-Express Better Auth mounts, Prisma connection pool, in-DB rate limiting) — a poor fit for Vercel functions. Vercel's `nestjs` preset re-compiled from source and its function runtime disabled `require(ESM)`, throwing `ERR_REQUIRE_ESM` on Better Auth (ESM-only) and forcing an esbuild bundling hack; serverless also brings Prisma connection-pool exhaustion and cold starts. On a normal Node 24 host the plain `nest build` output runs fine (`require(ESM)` works), so the bundling was reverted.

Live service: `https://restaurant-platform-api-9tw7.onrender.com` (free plan → spins down after ~15min idle; build folds `prisma migrate deploy` + admin seed). Target prod host: `api.ica2.xyz` (CNAME → Render). `ica2.xyz` is the cheap **dev/staging** domain bought to unblock the clean shared-domain architecture below — swap it for the real brand domain later by changing only env values + DNS.

**Domain layout (confirmed):** apex `ica2.xyz` = marketing (unassigned/placeholder for now — no marketing app yet); `*.ica2.xyz` = customer diner menus (`<slug>.ica2.xyz`); `panel.ica2.xyz` + `*.panel.ica2.xyz` = dashboard staff workspaces; `api.ica2.xyz` = API (Render); `admin.ica2.xyz` = admin (hosted, not local-only — local-against-prod-API would reintroduce the cross-site cookie problem). `api`/`admin`/`panel` are specific records that win over the `*` catch-all and are in the `RESERVED_SLUGS` denylist so no tenant can claim them. **Tenant `path` mode was REMOVED** (was for wildcard-less vercel.app staging) — `@repo/core` now has a single `tenantHost(host, slug)` helper; subdomain routing is the only mode.

**Cross-domain cookies — solved by a shared root domain (the reverse proxy was REMOVED, 2026-06).** Setting `ROOT_DOMAIN=ica2.xyz` on the API makes Better Auth's `crossSubDomainCookies` set the session cookie on `.ica2.xyz`. It's then first-party to every subdomain (same-site `SameSite=Lax` fetches to `api.ica2.xyz` carry it), so **no `/api` reverse proxy is needed**. The machinery was already in the code (gated on `ROOT_DOMAIN`): `crossSubDomainCookies` in `instances.ts`, `*.<host>` CORS in `main.ts`, the `*.ROOT_DOMAIN` `trustedOrigins` wildcard. Per-app prod env: `NEXT_PUBLIC_API_URL=https://api.ica2.xyz/api` (absolute), `API_INTERNAL_URL` optional (SSR fallback only). Deleted in the cleanup: the `next.config` `rewrites()` block + `API_ORIGIN` (gone from all 3 apps and `turbo.json` globalEnv), and the relative-URL/`window.location.origin` branch in `auth-client.ts` (back to `new URL(apiUrl).origin`).

**Google OAuth — solved by the same shared domain.** The customer Google callback (`api.ica2.xyz/...callback/google`) sets the cookie on `.ica2.xyz` and redirects back to the tenant menu, where it's already present. No per-instance `baseURL` hack needed. Email/password, passwordless, passkeys, Google all work once `ROOT_DOMAIN` + the DNS are in place.

**Email — any IPv4-reachable transactional provider over SMTP, NOT Gmail.** Render has no IPv6 egress; Gmail SMTP resolves to IPv6 → `ENETUNREACH`. Resend is the recommended default (free 3k/mo; `smtp.resend.com:465`, user `resend`, pass = API key) but it's provider-agnostic — SES/Brevo/Postmark work the same way via the existing `SmtpEmailSender` (Nodemailer over SMTP; no code change). Resend/SMTP is the *provider*, not a replacement for Nodemailer. Verify the sending domain (`ROOT_DOMAIN`) with the provider's DKIM/SPF records; `EMAIL_FROM=no-reply@<root>` needs no mailbox. Email only gates dashboard invitations, password reset, and customer email-OTP — everything else (Google, passkeys) works without it. `render.yaml` already encodes this. Related: [[qr-menu-longterm-plan]].
