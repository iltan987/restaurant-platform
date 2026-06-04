<!--
SYNC IMPACT REPORT
==================
Version change: (template, unversioned) → 1.0.0
Bump rationale: First concrete ratification of the constitution. The file was a pure
  placeholder template; replacing every token with project-derived principles is the
  initial adoption, so MAJOR baseline 1.0.0.

Principles defined (all new — derived from CLAUDE.md established conventions):
  - I. Schema-First Contract (NON-NEGOTIABLE)
  - II. Strict Layering & Dependency Direction
  - III. Type Safety & Boundary Validation
  - IV. Test Discipline for Contracts & Services
  - V. Localization & Convention Consistency

Sections defined:
  - Technology & Architecture Constraints (was [SECTION_2_NAME])
  - Development Workflow & Quality Gates (was [SECTION_3_NAME])
  - Governance

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — Constitution Check gate aligns; no edit
        required (it defers gates to "the constitution file", which is now populated).
  - ✅ .specify/templates/spec-template.md — no mandatory section conflicts introduced.
  - ✅ .specify/templates/tasks-template.md — task categories (tests optional, grouped
        by story) remain consistent with Principle IV (tests required for contract/service
        changes, not blanket TDD).
  - ⚠ .specify/templates/commands/*.md — directory does not exist in this repo; nothing
        to update.

Runtime guidance docs:
  - ✅ CLAUDE.md — already the canonical runtime guidance; constitution references it as
        such. No edit required.

Deferred / TODO items: none. RATIFICATION_DATE set to first-adoption date (today).
-->

# Restaurant Platform Constitution

## Core Principles

### I. Schema-First Contract (NON-NEGOTIABLE)

`@repo/schemas` is the single source of truth for the client↔server boundary, and every
crossing of that boundary MUST go through it.

- Request bodies MUST be validated server-side with a Zod schema from `@repo/schemas`
  (via `ZodValidationPipe`) before any business logic runs.
- Every error response MUST carry a stable `code` from the canonical `ErrorCode` enum and
  conform to the `{ statusCode, code, message }` shape produced by the global
  `HttpExceptionFilter`. Services emit domain codes explicitly; the filter only ever
  synthesizes generic codes.
- Clients MUST consume endpoints through `apiFetch(url, schema)` from `@repo/api-client`,
  which validates the response against the shared schema. Hand-rolled fetch/parse/error
  handling at call sites is prohibited.
- A new endpoint or a changed payload MUST update `@repo/schemas` first; adding an
  `ErrorCode` requires a corresponding Turkish mapping in `@repo/i18n`.

**Rationale**: The schema package is the contract. When it is the only path across the
boundary, client and server cannot silently drift, and every failure has one stable,
localizable identity.

### II. Strict Layering & Dependency Direction

The monorepo dependency graph is one-directional and MUST stay that way.

- Apps depend on packages; packages may depend on lower-level packages
  (e.g. `@repo/schemas` → `@repo/core`); packages MUST NEVER import an app.
- The `api` app is the only component permitted to touch the database. Other apps reach
  data exclusively through the API.
- The compiled-vs-source rule is decided by *who consumes the package*: a package in the
  `api` import graph (directly or transitively) MUST ship a `build` step and be consumed
  from `dist/`; a package consumed only by Next.js apps ships source. Changing a package's
  consumers requires re-evaluating this classification.
- Pure, framework-agnostic helpers belong in `@repo/core`; Zod schemas belong in
  `@repo/schemas`. Domain logic MUST NOT leak framework dependencies into `@repo/core`.

**Rationale**: A single direction of dependency keeps the graph acyclic, makes the build
order deterministic, and guarantees that shared packages remain reusable across every app.

### III. Type Safety & Boundary Validation

Static types and runtime validation are both required; neither substitutes for the other.

- TypeScript runs in `strict` mode with `noUncheckedIndexedAccess`; new code MUST compile
  clean under `pnpm typecheck` with no suppressions (`@ts-ignore`/`@ts-expect-error`/`any`)
  unless the suppression is justified in an adjacent comment.
- Any data entering the system from outside a trust boundary (HTTP request, external
  service, env input) MUST be validated at runtime with Zod before use — static types
  alone do not protect a boundary.
- Shared schemas MUST remain locale- and message-agnostic. Form-specific, user-facing
  messages live in a `$ZodErrorMap` passed to the resolver, never duplicated as schema
  constraints.

**Rationale**: Compile-time types catch internal mistakes; runtime validation catches
hostile or malformed external input. The contract is only trustworthy when both hold.

### IV. Test Discipline for Contracts & Services

Tests protect the parts of the system whose breakage is silent and costly.

- Backend service logic and any change to the shared contract (`@repo/schemas` shapes,
  `ErrorCode` values, endpoint behavior) MUST be covered by tests — colocated `*.spec.ts`
  unit tests and/or `test/*.e2e-spec.ts` e2e tests.
- A bug fix MUST add or extend a test that fails before the fix and passes after, so the
  regression cannot return unnoticed.
- Tests MUST pass before work is considered complete; a skipped or failing test MUST be
  reported as such, never presented as passing.
- Blanket TDD is encouraged but not mandated; test coverage of contracts and service
  behavior is mandated.

**Rationale**: The contract and the backend services are the shared surfaces where a
silent break propagates to every consumer. Those surfaces earn mandatory tests; pure
presentational code does not carry the same obligation.

### V. Localization & Convention Consistency

User-facing language and code style are centralized, not re-decided per file.

- User-facing strings shared across apps live in `@repo/i18n`. The backend pins English
  (`z.config(z.locales.en())`); each Next app sets its locale once via `ZodInit`. Strings
  MUST NOT be hardcoded at call sites when an `@repo/i18n` home exists.
- Formatting is enforced by Prettier (no semicolons, double quotes, `printWidth: 80`, the
  Tailwind class-sorting plugin). Code MUST pass `pnpm lint` and `pnpm format` before merge.
- Shared dependency versions MUST be referenced from the `catalog:` in
  `pnpm-workspace.yaml`, never hardcoded in a `package.json`.
- New shared components compose `@repo/ui` primitives and `cn()`; apps MUST NOT fork UI
  primitives locally.

**Rationale**: Centralizing language and style removes a class of review noise and keeps
the four apps coherent, so a user moving between them sees one product, not four.

## Technology & Architecture Constraints

- **Stack**: Turborepo monorepo, `pnpm@11`. `api` is NestJS 11; `dashboard`, `admin`, and
  `customer` are Next.js 16; data layer is Prisma 7 over Postgres 18 via the
  `@prisma/adapter-pg` driver adapter. `@repo/ui` is Base UI + shadcn (style `base-nova`)
  on Tailwind v4. New work MUST use these technologies unless an amendment adds another.
- **Dev ports** are fixed: api `3000` (`/api` prefix), dashboard `3001`, customer `3002`,
  admin `3003`. CORS origins derive from `ADMIN_URL`/`DASHBOARD_URL`.
- **Multi-tenancy**: dashboard tenants are resolved by subdomain in `proxy.ts`, which
  rewrites `/` → `/s/<slug>`. Tenant lookups MUST `notFound()` for missing or non-`ACTIVE`
  restaurants; the apex domain blocks direct `/s/` access.
- **Data fetching**: Next apps follow the per-feature `features/<name>/` convention
  (`api.ts` over `apiFetch`, `queries.ts` `queryOptions` factories, `use-*.ts` mutation
  hooks). Server components prefetch with `getQueryClient()` and dehydrate; the query
  client MUST NOT be created via `useState`.
- **Database access** is mediated by `PrismaService`, which wraps the `@repo/db` singleton
  and exposes one delegate field per model. New models add a delegate there.
- **Environment**: each app owns its `.env`/`.env.local` mirroring its `.env.example`.
  Secrets MUST NOT be committed.

## Development Workflow & Quality Gates

- **SpecKit drives feature work.** Substantive features flow through the SpecKit artifacts
  (spec → plan → tasks). The SpecKit-managed block in `CLAUDE.md` and the `.specify/`
  tree MUST be left intact.
- **Quality gates before merge**: `pnpm lint`, `pnpm typecheck`, and the relevant test
  suite (`pnpm --filter api test` / `test:e2e`) MUST pass. Prisma client changes MUST be
  regenerated via `db:generate`.
- **Commits & branches**: commit or push only when asked; branch off `master` rather than
  committing directly to it for non-trivial work. Per project memory, commit messages
  OMIT the `Co-Authored-By` trailer.
- **Review**: changes touching the client↔server contract, the dependency graph, or a
  shared package MUST be reviewed against this constitution's principles. Any deviation
  MUST be justified in the PR description, not merged silently.

## Governance

This constitution supersedes ad-hoc convention where the two conflict. Established user
instructions in `CLAUDE.md` and direct user requests take precedence over it.

- **Amendments** require a written change to this file, a version bump per the policy
  below, an updated Sync Impact Report, and propagation to any dependent `.specify/`
  template or guidance doc affected by the change.
- **Versioning policy** (semantic): **MAJOR** for backward-incompatible governance or
  principle removals/redefinitions; **MINOR** for a new principle/section or materially
  expanded guidance; **PATCH** for clarifications and non-semantic refinements.
- **Compliance review**: plans run the Constitution Check gate before Phase 0 and again
  after design. Reviewers verify PRs against the principles above; unjustified complexity
  or boundary violations block merge.
- **Runtime guidance**: `CLAUDE.md` is the canonical day-to-day development guide and the
  operational companion to this constitution. Where `CLAUDE.md` documents a concrete
  procedure (commands, gotchas, memory rules), it governs execution; where it conflicts
  with a principle here, this constitution governs intent.

**Version**: 1.0.0 | **Ratified**: 2026-06-04 | **Last Amended**: 2026-06-04
