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

**How to apply:** API env mirrors `apps/api/.env` (prod variants: R2 storage, Gmail SMTP). Set the API's `BETTER_AUTH_URL` to the Render service URL, leave `ROOT_DOMAIN` unset (apps are on `*.vercel.app`, path-mode), and point each Vercel app's `NEXT_PUBLIC_API_URL` at `https://<render-url>/api`. Add the Google OAuth redirect URI `https://<render-url>/api/auth/customer/callback/google`. Cross-host session cookies stay third-party until a shared root domain (`api.<root>` + `<slug>.<root>`). Related: [[qr-menu-longterm-plan]].
