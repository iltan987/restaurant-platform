# Phase 0 Research: Automated Import Hygiene & Pre-Commit Formatting

All findings verified against current (mid-2026) upstream docs. The repo is on ESLint
**9.39.4**, Prettier **3.8**, pnpm **11.5.1**, Turborepo **2.9**.

## Decision 1 — Import sorting + unused removal: ESLint plugins (not a Prettier plugin)

**Decision**: Add `eslint-plugin-simple-import-sort` (ordering) and
`eslint-plugin-unused-imports` (removal) to the shared `@repo/eslint-config/base.js`.

**Rationale**:
- Both are **auto-fixable via `eslint --fix`** — no new tooling beyond ESLint, which the
  commit pipeline and CI (`turbo lint`) already run. This makes local and CI rules
  identical for free (FR-010 / SC-006).
- Only ESLint can *remove* unused imports (FR-002); a Prettier sort plugin
  (`@ianvs/prettier-plugin-sort-imports`) only reorders, so ESLint is required regardless —
  using one tool for both avoids two systems fighting over import order.
- `simple-import-sort` **does not reorder side-effect imports** (`import "./styles.css"`):
  per its docs, "Imports that are only used for side effects stay in the input order."
  This satisfies FR-012 (preserve load-order semantics) with no extra configuration.
- Ordering is **deterministic** — re-running `--fix` on sorted code is a no-op (SC-001).

**Alternatives considered**:
- *`@ianvs/prettier-plugin-sort-imports`*: sorts during `prettier --write`, globally, with
  no ESLint-config-resolution concerns — but cannot remove unused imports and would need a
  second tool anyway; risks conflicting with any ESLint import ordering. Rejected.
- *`eslint-plugin-import` (`import/order`)*: heavier, needs resolver setup, type-aware,
  slower; `simple-import-sort` is purpose-built, faster, and zero-resolver. Rejected.

**Unused-imports recipe** (from plugin docs, to avoid double-reporting with
`@typescript-eslint/no-unused-vars` that `tseslint.configs.recommended` enables):
- turn `@typescript-eslint/no-unused-vars` **off**,
- `unused-imports/no-unused-imports: "error"` (auto-fixable removal of unused imports),
- `unused-imports/no-unused-vars: ["warn", { vars, varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" }]` (keeps unused-var feedback, non-fixable, underscore-escape).

## Decision 2 — Import group order (the canonical policy)

**Decision**: Six-tier `groups` reflecting the monorepo's dependency layering
(spec FR-001: external → `@repo/*` → `@/*` → relative, with side-effect and node tiers):

```js
groups: [
  ["^\\u0000"],            // 1. side-effect imports (kept in source order by the plugin)
  ["^node:"],              // 2. node builtins
  ["^@(?!repo/|/)\\w", "^\\w"],  // 3. external packages (scoped non-@repo + bare)
  ["^@repo/"],             // 4. workspace packages
  ["^@/"],                 // 5. app-internal alias
  ["^\\."],                // 6. relative (parent then sibling)
]
```

**Rationale**: `simple-import-sort` assigns each import to the **first** matching group
**and** renders groups in array order — so the external regex uses a negative lookahead
`(?!repo/|/)` to exclude `@repo/*` and `@/*`, letting those render in their own later
tiers while still keeping external packages first. Mirrors the architecture's layering
(external → `@repo/*` → `@/*` → relative). The exact regex set is refined in
`contracts/import-ordering-policy.md`. Intra-group order is alphabetical/deterministic.

**Alternatives considered**: plugin defaults (5 groups, no `@repo`/`@/` split) — simpler
but does not give the layered grouping the spec asks for. Rejected in favor of the explicit
groups; adjustable later via the single `base.js` config.

## Decision 3 — Commit-time runner: husky + lint-staged

**Decision**: `husky` (installs git hooks via a root `"prepare": "husky"` script) +
`lint-staged` (single root `.lintstagedrc.mjs`). `.husky/pre-commit` runs
`pnpm exec lint-staged`.

**Rationale**:
- husky's `prepare` lifecycle script runs automatically on `pnpm install`, so the hook is
  active for every contributor with **no per-developer setup** (FR-007).
- lint-staged processes **only staged files** (FR-005) and, for partially-staged files,
  stashes the unstaged portion, runs fixers, and re-stages the fixed result — so the
  committed content is exactly what was processed (FR-011).
- It is the most documented, lowest-friction "easy" path the user asked for; pre-commit
  adds ~1–2s for a small changeset (SC-003).
- `--no-verify` on `git commit` is the standard, documented bypass (FR-008).

**Alternatives considered**:
- *lefthook*: faster, parallel, single binary, good monorepo ergonomics — but an extra
  binary/dependency model and less ubiquitous; husky+lint-staged is simpler for "done
  easily." Documented as the upgrade path if pre-commit latency becomes a problem.
- *simple-git-hooks*: lighter than husky but fewer guarantees around partial-staging
  safety; lint-staged's stash handling (FR-011) is the part we most want. Rejected.

## Decision 4 — ESLint config resolution across the monorepo (the crux)

**Decision**: Run lint-staged's eslint command with
`eslint --fix --no-warn-ignored --flag v10_config_lookup_from_file` from a **single root**
lint-staged config.

**Rationale**:
- **ESLint 9.0–9.11** resolves the config file from the **cwd, not the linted file** — so a
  single root `eslint --fix <files-across-workspaces>` would not pick up each workspace's
  `eslint.config.mjs`. The `v10_config_lookup_from_file` flag (introduced experimentally as
  `unstable_config_lookup_from_file`, renamed, available in 9.39.4) restores **per-file
  upward lookup**: ESLint finds each file's nearest `eslint.config.*`.
- This is **forward-compatible**: ESLint **v10.0.0 (released Feb 2026)** makes per-file
  lookup the default and *removes* the flag. The repo's `^9.39.4` stays on 9.x (caret won't
  jump majors); when the team bumps to ESLint 10, simply drop the flag — no behavior change.
- A **root `eslint.config.mjs` already exists** (ignores-only). With per-file lookup it is
  the universal fallback, so files outside a workspace (root `scripts/`, config-only
  packages like `@repo/eslint-config`) still resolve a config and never error.
- `--no-warn-ignored` suppresses the "file ignored by pattern" warning when lint-staged
  hands eslint a generated/ignored file (e.g. `packages/db/src/generated/**`, already
  ignored in that workspace's config), keeping FR-009 clean and output quiet.

**Alternatives considered**:
- *Per-workspace `.lintstagedrc` files* (lint-staged runs each with cwd = nearest config
  dir, where stable cwd-based ESLint resolution works): correct and uses only stable
  features, but means ~11 near-duplicate config files and a footgun for new packages.
  Rejected for DRY; the flag approach is one file.
- *Single root `eslint.config.mjs` aggregating all workspace configs with `files:` scoping*:
  invasive refactor of the established per-workspace config layout, error-prone across
  next/nest/react variants. Rejected.
- *Upgrade to ESLint 10 now* (per-file lookup is default, no flag): a major-version bump
  with its own breaking changes (typescript-eslint/plugin compat) — out of scope for a
  low-overhead tooling feature. Deferred; the flag bridges until then.

**Watch item**: an older bug (`--ignore-pattern` interplay with the flag) was reported on
early flag versions; verify ignore behavior during implementation on 9.39.4 (workspace
config `ignores` are the mechanism we rely on, not `--ignore-pattern`, so low risk).

## Decision 5 — Prettier scope & ignore

**Decision**: lint-staged runs `prettier --write` after `eslint --fix` on staged files;
extend `.prettierignore` with `**/src/generated/**`, `**/dist/**`, `**/.next/**`.

**Rationale**: Prettier honors `.prettierignore` even for explicitly-passed paths, so
generated/build outputs are never reformatted (FR-009). Running `eslint --fix` *before*
`prettier --write` means ESLint reorders/removes imports first, then Prettier applies final
formatting — no fighting, since `eslint-config-prettier` (already in base) disables ESLint
formatting rules and `simple-import-sort` is not a formatting concern Prettier touches.

## Decision 6 — One-time repo-wide normalization sweep

**Decision**: After wiring the rules, run `eslint --fix` + `prettier --write` across the
whole repo once and commit the (large, mechanical) churn as part of this feature.

**Rationale**: Turning the sort/unused rules to `error` makes the existing `turbo lint`
gate fail on today's "random" ordering until the codebase is normalized once. This sweep
is the moment SC-001 (0 ordering diffs going forward) and SC-005 (no ordering-only PR
churn) start holding. It is a one-time, reviewable, behavior-preserving diff.

## Resolved unknowns

| Unknown | Resolution |
| --- | --- |
| Does `simple-import-sort` reorder side-effect imports? | No — kept in source order (FR-012 ✅). |
| Will one root `eslint --fix` see per-workspace configs? | Only with `v10_config_lookup_from_file` (9.39.4 ✅) or per-workspace lint-staged configs. Chose the flag. |
| Is the flag future-proof? | Yes — it is the ESLint 10 default; drop on the v10 bump. |
| How to avoid config-less staged files erroring? | Root `eslint.config.mjs` fallback already exists. |
| Catalog the new deps? | No — each is single-consumer; promote later if shared. |
