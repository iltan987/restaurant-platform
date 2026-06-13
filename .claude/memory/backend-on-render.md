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

Live service: `https://restaurant-platform-api-9tw7.onrender.com` (free plan → spins down after ~15min idle; build folds `prisma migrate deploy` + admin seed). API env mirrors `apps/api/.env` prod variants (R2 storage, Gmail SMTP, Google, `BETTER_AUTH_SECRET`); `ROOT_DOMAIN` stays unset.

**Cross-domain cookies — solved via reverse proxy.** API on `onrender.com` ≠ apps on `*.vercel.app` made the session cookie third-party (`SameSite=Lax` → dropped). Fix: each Next app reverse-proxies `/api/*` to the API on its **own origin** (`next.config` `rewrites()` gated on `API_ORIGIN`), so the cookie is first-party and sessions persist in every browser incl. Safari. Per-app prod env: `NEXT_PUBLIC_API_URL=/api` (browser, same-origin), `API_INTERNAL_URL=<render>/api` (SSR hits Render directly), `API_ORIGIN=<render>` (proxy target). `API_ORIGIN`/`API_INTERNAL_URL` **must be in `turbo.json` `globalEnv`** or Turbo's strict-env strips them from the build and the rewrite silently vanishes. `auth-client.ts` uses `window.location.origin` when `NEXT_PUBLIC_API_URL` is relative.

**Still open:** customer **Google OAuth** redirects to the Render callback, so that one flow's cookie lands on `onrender.com` (not proxied) and won't persist — needs a follow-up (proxy the callback or per-instance `baseURL`). Email/password, passwordless, passkeys all work. Related: [[qr-menu-longterm-plan]].
