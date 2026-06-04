# Implementation Plan: Automated Import Hygiene & Pre-Commit Formatting

**Branch**: `001-manage-import-formatting` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-manage-import-formatting/spec.md`

## Summary

Automate import-statement ordering, unused-import removal, and Prettier/ESLint
auto-fixing at commit time, processing only staged files for low overhead.

**Technical approach**: Encode the rules once in the shared `@repo/eslint-config/base.js`
(via `eslint-plugin-simple-import-sort` for deterministic grouped ordering and
`eslint-plugin-unused-imports` for removal) so all 11 workspaces inherit them and the
existing `turbo lint` CI gate enforces the same rules. Wire commit-time execution with
**husky** (`prepare` script → auto-installs git hooks on `pnpm install`) + **lint-staged**
(single root config, staged-files-only). lint-staged runs `eslint --fix` then
`prettier --write` on each staged file. ESLint resolves each file's nearest workspace
config via the `v10_config_lookup_from_file` feature flag (already the default in the
just-released ESLint v10; forward-compatible on the repo's 9.39.4). The root
`eslint.config.mjs` already exists as the universal fallback, so no staged file is ever
left config-less.

## Technical Context

**Language/Version**: TypeScript ~5.9.3, Node 20; config files in ESM (`.mjs`)

**Primary Dependencies** (new): `husky` (git hooks), `lint-staged` (staged-file runner),
`eslint-plugin-simple-import-sort`, `eslint-plugin-unused-imports`. Existing: ESLint
9.39.4 (flat config, `typescript-eslint`), Prettier 3.8 (`prettier-plugin-tailwindcss`),
pnpm 11.5, Turborepo 2.9.

**Storage**: N/A (developer-tooling/config feature)

**Testing**: Validation via `quickstart.md` scenarios + the existing `turbo lint` /
`turbo format` CI gate. No unit tests (config-only change; see Constitution Check IV).

**Target Platform**: Contributor workstations (any OS pnpm supports) + CI

**Project Type**: Turborepo monorepo tooling — touches root config + `@repo/eslint-config`,
not application source.

**Performance Goals**: Commit-time overhead ≤ ~2s for a typical ≤10-file changeset
(SC-003). Only staged files processed (FR-005).

**Constraints**: Deterministic ordering (re-run = no-op, SC-001); side-effect imports
never reordered (FR-012); generated/build artifacts never processed (FR-009); local and
CI results agree (FR-010/SC-006); auto-activates after one `pnpm install` (FR-007); a
documented bypass exists (FR-008).

**Scale/Scope**: 4 apps + 7 packages (11 workspaces with their own `eslint.config.mjs`),
plus root-level config/scripts.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
| --- | --- |
| **I. Schema-First Contract** | N/A — no client↔server boundary touched. |
| **II. Strict Layering & Dependency Direction** | ✅ Aligns. Rules live in the shared config package `@repo/eslint-config` (consumed by all workspaces, imports no app). New plugins are its devDependencies. No new cross-layer edges. `@repo/eslint-config` stays a source package. |
| **III. Type Safety & Boundary Validation** | ✅ No production TS added. The two new ESLint rules are syntactic (no type info needed), so they do not change the type-checking surface. |
| **IV. Test Discipline for Contracts & Services** | ✅ Compliant. This is build/tooling, not service or contract logic; the constitution mandates tests for contracts/services specifically. Verification is the `quickstart.md` scenarios plus the `turbo lint`/`format` gate that now enforces the rules. |
| **V. Localization & Convention Consistency** | ✅ **Directly operationalizes this principle** ("Code MUST pass `pnpm lint` and `pnpm format` before merge"). Rules are configured once at the monorepo level (FR-013). Catalog rule: `husky`/`lint-staged` are root-only and the two plugins are `@repo/eslint-config`-only — each used by a single `package.json`, so `catalog:` (which exists to share a version across multiple manifests) does not apply; if any becomes multi-consumer later, promote it to the catalog. |

**Workflow gates**: After the one-time repo-wide autofix sweep (see Phase 1 / tasks),
`pnpm lint`, `pnpm typecheck`, and `pnpm format` all pass. No Prisma changes.

**Result**: PASS — no violations, Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/001-manage-import-formatting/
├── plan.md              # This file
├── research.md          # Phase 0: tool/flag decisions + rationale
├── data-model.md        # Phase 1: config artifacts + import-group policy
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   ├── import-ordering-policy.md   # canonical group order (the "contract")
│   └── commit-pipeline.md          # lint-staged command + hook contract
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

This feature edits configuration at the monorepo root and in the shared lint config
package; it does not add application source.

```text
restaurant-platform/
├── package.json                     # + "prepare": "husky"; + husky, lint-staged devDeps
├── .husky/
│   └── pre-commit                   # NEW — runs `pnpm exec lint-staged`
├── .lintstagedrc.mjs                # NEW — root lint-staged config (single source)
├── .prettierignore                  # EDIT — add generated/dist/.next excludes
├── eslint.config.mjs                # (exists) root fallback — unchanged
└── packages/eslint-config/
    ├── package.json                 # + simple-import-sort, unused-imports devDeps
    └── base.js                      # EDIT — add sort + unused-import rules (inherited by all)
```

**Structure Decision**: Single shared-config home. The import/unused rules go in
`packages/eslint-config/base.js`, which every one of the 11 workspace `eslint.config.mjs`
files already spreads (`...baseConfig`), so the policy propagates with no per-workspace
edits. Commit-time orchestration is a single root `.lintstagedrc.mjs` + one `.husky/pre-commit`
hook. This keeps one source of truth for rules (FR-013) and one source of truth for the
commit pipeline, matching the repo's existing per-workspace-config + run-from-root layout.

## Complexity Tracking

No constitution violations — section intentionally empty.
