# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->

## Commands

All commands run from the repo root via Turborepo. pnpm is the package manager (`pnpm@11`).

| Task | Command |
| --- | --- |
| Install | `pnpm install` |
| Run everything in dev | `pnpm dev` |
| Build all | `pnpm build` |
| Lint / typecheck / format | `pnpm lint` · `pnpm typecheck` · `pnpm format` |
| Wipe outputs + node_modules + .turbo | `pnpm clean` (two-phase, see `scripts/clean.mjs`) |

Scope a Turbo task to one workspace with `--filter`, e.g. `turbo dev --filter=admin`, `turbo typecheck --filter=@repo/db`.

**Dev ports:** api `3000` (prefix `/api`) · dashboard `3001` · customer `3002` · admin `3003`.

**API (NestJS) — run from `apps/api/`:**
- `pnpm --filter api test` — Jest unit tests (`*.spec.ts` colocated under `src/`)
- `pnpm --filter api test -- restaurants.service` — single test file by pattern
- `pnpm --filter api test:e2e` — e2e tests (`test/*.e2e-spec.ts`, separate `test/jest-e2e.json` config)
- `pnpm --filter api test:cov` — coverage

**Database (`@repo/db`):** `docker compose up -d` starts Postgres 18 on `:5432`. Then from `packages/db/`:
- `pnpm --filter @repo/db db:generate` — regenerate Prisma client into `src/generated/prisma/` (also runs automatically before `build`/`dev` via Turbo)
- `pnpm --filter @repo/db db:migrate` · `db:push` · `db:studio`

## Architecture

Turborepo monorepo. **Four apps** consume **shared packages**; the dependency rule is one-directional: apps → packages, and packages may depend on lower-level packages (e.g. `@repo/schemas` → `@repo/core`), but packages never import apps.

**Apps (`apps/*`):**
- `api` — NestJS 11 backend, the only thing that touches the database.
- `dashboard` — Next.js 16 tenant-facing storefront. Multi-tenant via subdomain (see below).
- `admin` — Next.js 16 internal panel for managing restaurants.
- `customer` — Next.js 16 customer app (early/minimal).

**Packages (`packages/*`):**
- `@repo/core` — framework-agnostic, dependency-free domain logic + primitives shared everywhere (frontend, backend, and `@repo/schemas`). Currently holds the slug module (`SLUG_MAX`, `SLUG_REGEX`, `slugify()`). This is the home for pure helpers that aren't Zod schemas — add future utilities (currency, time, IDs…) here, not in `@repo/schemas`.
- `@repo/schemas` — Zod 4 schemas + types shared by frontend and backend. **The contract between client and server.** Holds input schemas, API response schemas, and the canonical `ErrorCode` enum / `ApiError` shape. Composes slug primitives from `@repo/core` (it imports `SLUG_MAX`/`SLUG_REGEX`, it does not define them).
- `@repo/db` — Prisma 7 client (`prisma-client` generator → `src/generated/prisma/`), built via `tsc`. Exports a `prisma` singleton using the `@prisma/adapter-pg` driver adapter, plus generated model/enum types.
- `@repo/ui` — shared component library (Base UI + shadcn, style `base-nova`), Tailwind v4, `next-themes`, `sonner`. Owns `globals.css`. Consumed via subpath exports like `@repo/ui/components/button`. `cn()` lives in `@repo/ui/lib/utils`.
- `@repo/query` — TanStack Query setup: `getQueryClient()` (SSR-safe singleton) + `QueryProvider`.
- `@repo/eslint-config`, `@repo/typescript-config` — shared base configs (`base`, `next-js`, `nestjs`, `react-internal` / `base`, `nestjs`, `nextjs`, `react-library`).

### The client↔server contract (most important pattern)

`@repo/schemas` is the single source of truth shared across the boundary:
1. **Backend** validates request bodies with `ZodValidationPipe` wrapping a schema (e.g. `createRestaurantSchema`) in the controller.
2. **Backend** throws structured exceptions carrying a stable `code` from `ErrorCode` (e.g. `{ code: ErrorCode.SLUG_TAKEN, message }`). The global `HttpExceptionFilter` (registered as `APP_FILTER`) normalizes *every* response into `{ statusCode, code, message }`. Domain codes are only emitted when a service throws them explicitly; the filter's `statusToCode` only ever produces *generic* codes so an unrelated 404 is never mislabeled.
3. **Frontend** `fetch` wrappers parse responses through the schema (`restaurantSchema.parse(...)`) and throw a local `ApiError(code, message)` on failure.
4. **Frontend** maps `code` → localized (Turkish) string via `lib/messages.ts` (`getErrorMessage`). The backend `message` is English, for logs/other consumers.

When adding an endpoint: add/extend the schema in `@repo/schemas`, add the `ErrorCode` if a new failure needs a distinct UI message, throw it structured in the service, and add the Turkish mapping in each consuming app's `lib/messages.ts`.

### Multi-tenant subdomain routing (dashboard)

`apps/dashboard/proxy.ts` is Next.js middleware that extracts a tenant subdomain (`<slug>.localhost:3001` in dev, `<slug>.ROOT_DOMAIN` in prod, `tenant---branch.vercel.app` for previews) and **rewrites** `/` → `/s/<slug>` while keeping the browser URL on the subdomain. The apex domain blocks direct `/s/` access. The `/s/[slug]` server component prefetches the restaurant via TanStack Query `fetchQuery`, calls `notFound()` for missing or non-`ACTIVE` tenants, and dehydrates the cache into a `HydrationBoundary`.

### Data fetching convention (Next apps)

Per-feature folders under `features/<name>/`: `api.ts` (typed fetch wrappers + `ApiError`), `queries.ts` (`queryOptions` factories with stable `queryKey`s), `use-*.ts` (mutation hooks). Mutations use optimistic updates with rollback (see `use-create-restaurant.ts`). Server components prefetch with `getQueryClient()` from `@repo/query/get-query-client` and dehydrate; never call `useState` to make the query client.

### Forms & i18n (Zod locale)

Each Next app sets its Zod locale **once on the client** via a `ZodInit` component (`z.config(z.locales.tr())`) rendered in `providers.tsx`. The backend pins English (`z.config(z.locales.en())` in `main.ts`). Forms use `react-hook-form` + `@hookform/resolvers/zod`. Shared schemas stay locale/message-agnostic — form-specific, user-facing messages go in a `$ZodErrorMap` passed to `zodResolver(schema, { error: ... })`, **not** duplicated as constraints. Extend shared schemas (`.extend(...)`) for form-only structural tweaks.

## Conventions & gotchas

- **Catalog versions:** shared dependency versions are pinned in `pnpm-workspace.yaml` under `catalog:`. Reference them as `"next": "catalog:"` in package.json rather than hardcoding versions.
- **Prettier:** no semicolons, double quotes, `printWidth: 80`. Tailwind plugin sorts classes and is aware of `cn`/`cva`.
- **TS:** strict, `NodeNext` modules, `noUncheckedIndexedAccess` on. Path alias `@/*` maps to app/src root.
- **NestJS build (SWC/TS6 gotchas):** see the `project_nestjs_swc` memory — `baseUrl` panic and `dist/src` output bug have specific fixes.
- **PrismaService** (`apps/api/src/prisma/prisma.service.ts`) wraps the `@repo/db` singleton and re-exposes model delegates directly (`this.prisma.restaurant`). Add a delegate field per new model.
- **Env files:** each app has its own `.env` / `.env.local` (see `.env.example` in each). Frontend needs `NEXT_PUBLIC_API_URL`; dashboard needs `NEXT_PUBLIC_ROOT_DOMAIN`; admin needs `NEXT_PUBLIC_DASHBOARD_URL`; api needs `DATABASE_URL`, `ADMIN_URL`, `DASHBOARD_URL` (the latter two derive CORS origins, including tenant subdomains).
- **SpecKit:** this repo uses SpecKit (`.specify/`, speckit-* skills). Spec/plan/task artifacts drive feature work; the block at the top of this file is SpecKit-managed — leave it intact.
