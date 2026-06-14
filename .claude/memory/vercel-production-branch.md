---
name: vercel-production-branch
description: "Vercel production branch must be `main`; if prod seems stale, check it (was stuck on `master`)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 631858a3-a4c9-4d50-ac4c-6844d90d4f7d
---

All three Vercel projects (`restaurant-platform-customer`, `-dashboard`, `-admin`) deploy from this repo. The repo's default branch is **`main`**.

On 2026-06-14 the customer project's Vercel **Production Branch** was still set to `master` (the repo had been renamed/moved master→main). Effect: every push to `main` deployed with `target: null` (non-production) and never reached `ica2.xyz` — the live site was frozen ~5 commits back at the last `master` deployment, so shipped fixes silently didn't appear in prod. Tell-tale signs: a `…-git-master-….vercel.app` project domain, and recent deployments showing `target: null` in `list_deployments`.

**Fix applied:** switch Production Branch → `main` (Vercel → Settings → Git) for all three projects, then promote/redeploy.

**How to apply:** if a prod change "isn't showing" despite a green deploy, first verify the Vercel production branch is `main` and that the latest deployment has `target: "production"` — before debugging app code. The Vercel MCP tools are read-only for project settings, so this branch switch must be done in the dashboard.
