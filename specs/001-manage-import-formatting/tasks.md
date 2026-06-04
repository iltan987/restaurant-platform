---
description: "Task list for Automated Import Hygiene & Pre-Commit Formatting"
---

# Tasks: Automated Import Hygiene & Pre-Commit Formatting

**Input**: Design documents from `specs/001-manage-import-formatting/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No automated test tasks. This is a config/tooling change (Constitution
Principle IV mandates tests for contracts/services, not tooling). Verification is via
`quickstart.md` scenarios + the existing `turbo lint` / `turbo format` CI gate.

**Organization**: Tasks grouped by user story (P1 → P3) for independent delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 (from spec.md)
- Exact file paths included.

## Path Conventions

Monorepo root is `/home/icaner/projects/restaurant-platform/`. Paths below are
repo-relative. The feature touches root-level config + `packages/eslint-config/`; it does
not add application source.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install the new dev dependencies (CLI-driven; do not hand-edit `package.json`).

- [ ] T001 Install commit-runner deps at the workspace root: run `pnpm add -D -w husky lint-staged` (adds to root `package.json` devDependencies)
- [ ] T002 Install lint-rule plugins into the shared config package: run `pnpm add -D --filter @repo/eslint-config eslint-plugin-simple-import-sort eslint-plugin-unused-imports` (adds to `packages/eslint-config/package.json` devDependencies)

> Note: T001 and T002 are NOT parallel — both mutate `pnpm-lock.yaml`; run sequentially.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cross-cutting ignore rules that must exist before any repo-wide fixing or
commit-time processing runs, so generated/build output is never touched (FR-009).

**⚠️ CRITICAL**: Complete before the US1 normalization sweep and the US2 pipeline run.

- [ ] T003 Extend `.prettierignore` (repo root) with `**/src/generated/**`, `**/dist/**`, and `**/.next/**` (keep existing `.turbo/` and `pnpm-lock.yaml` entries)

**Checkpoint**: Generated/build paths are protected — story work can begin.

---

## Phase 3: User Story 1 - Deterministic import ordering & unused-import removal (Priority: P1) 🎯 MVP

**Goal**: Imports are sorted into the canonical monorepo grouping and unused imports are
removed, deterministically and repo-wide, via rules in the shared ESLint config.

**Independent Test**: Scramble a file's imports + add an unused import, run
`pnpm exec eslint --fix --flag v10_config_lookup_from_file <file>` → imports are in
canonical order and the unused import is gone; re-running is a no-op (quickstart Scenario A).

### Implementation for User Story 1

- [ ] T004 [US1] Add `eslint-plugin-simple-import-sort` to `packages/eslint-config/base.js`: import the plugin, register it under `plugins`, and add `"simple-import-sort/imports": ["error", { groups: [...] }]` + `"simple-import-sort/exports": "error"`, using the exact 6-tier `groups` array from `contracts/import-ordering-policy.md`
- [ ] T005 [US1] Add `eslint-plugin-unused-imports` to `packages/eslint-config/base.js` (same file, after T004): register the plugin, set `"@typescript-eslint/no-unused-vars": "off"`, `"unused-imports/no-unused-imports": "error"`, and `"unused-imports/no-unused-vars": ["warn", { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" }]` (recipe from `research.md` Decision 1)
- [ ] T006 [US1] Run the one-time repo-wide normalization sweep: `pnpm exec eslint . --fix --flag v10_config_lookup_from_file` (this applies the new rules across all 11 workspaces; expect a large mechanical, behavior-preserving diff)
- [ ] T007 [US1] Verify US1: `pnpm lint` passes clean repo-wide; re-running `pnpm exec eslint . --fix --flag v10_config_lookup_from_file` produces zero changes (SC-001); confirm no unused imports remain (SC-002); confirm side-effect imports were not reordered (FR-012)

**Checkpoint**: Rules live in the shared config, the repo is normalized, and `turbo lint`
is green — US1 is independently shippable (the rules also auto-apply in CI from here).

---

## Phase 4: User Story 2 - Auto-format and lint-fix at commit, low overhead (Priority: P2)

**Goal**: On `git commit`, staged files are auto-fixed by ESLint and formatted by Prettier,
processing only staged files for low overhead.

**Independent Test**: Stage a file with a Prettier deviation and commit; the committed file
is formatted, only staged files were touched, and overhead is ≲ ~2s for a small changeset
(quickstart Scenario B). Non-auto-fixable errors block the commit (Scenario C).

### Implementation for User Story 2

- [ ] T008 [P] [US2] Create root `.lintstagedrc.mjs` with the glob→command map from `contracts/commit-pipeline.md`: `*.{ts,tsx,mts,cts}` → `["eslint --fix --no-warn-ignored --flag v10_config_lookup_from_file", "prettier --write"]`; `*.{js,jsx,mjs,cjs,json,md,css,yaml,yml}` → `"prettier --write"`
- [ ] T009 [US2] Initialize husky: run `pnpm exec husky init` (adds `"prepare": "husky"` to root `package.json` and creates the `.husky/` directory + a sample `pre-commit`)
- [ ] T010 [US2] Replace the contents of `.husky/pre-commit` (created by T009) with `pnpm exec lint-staged`
- [ ] T011 [US2] Verify US2: stage a file with a format/lint-fixable deviation and commit → committed file conforms to Prettier config, unstaged files untouched, overhead ≲ ~2s (SC-003); introduce a non-fixable error and confirm the commit is blocked with file+rule reported (FR-006); confirm a generated file commits without reformatting or an "ignored" warning (Scenario D / FR-009)

**Checkpoint**: Commit-time auto-fix + format works on staged files only — US2 functional
independently of US1's specific rules (the pipeline runs regardless of which ESLint rules
are active).

---

## Phase 5: User Story 3 - Consistent enforcement for everyone, with an escape hatch (Priority: P3)

**Goal**: The rules apply to every contributor after one `pnpm install`, an emergency
bypass exists, and the CI gate is the backstop.

**Independent Test**: Fresh clone + `pnpm install` activates commit-time fixing with no
extra steps (Scenario F); `git commit --no-verify` bypasses (Scenario E); `pnpm lint` /
`pnpm format` enforce the same rules CI runs (Scenario G).

**Depends on**: US1 (rules at `error`) + US2 (husky `prepare` activation + pre-commit hook).

### Implementation for User Story 3

- [ ] T012 [US3] Document the feature in `CLAUDE.md` under "Conventions & gotchas": the canonical import-group order, that ESLint auto-sorts + removes unused imports on commit via husky + lint-staged, and the `git commit --no-verify` bypass (FR-008 / FR-013)
- [ ] T013 [US3] Validate zero-setup activation: in a fresh clone (or after removing `.husky` and re-running `pnpm install`), confirm `.husky/pre-commit` is present and a messy-import commit is auto-fixed without any step beyond `pnpm install` (SC-004 / FR-007)
- [ ] T014 [US3] Validate enforcement parity + bypass: confirm `git commit --no-verify` skips the checks (FR-008), and that `pnpm lint` + `pnpm format` pass clean and would catch a bypassed unformatted change (FR-010 / SC-006)

**Checkpoint**: All three stories functional; rules enforced locally and in CI with a
documented escape hatch.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final end-to-end validation and gate confirmation.

- [ ] T015 Run the full `quickstart.md` validation (Scenarios A–G) end-to-end and confirm each expected outcome
- [ ] T016 Confirm the workflow quality gates pass: `pnpm lint`, `pnpm typecheck`, and `pnpm format` all clean (constitution Development Workflow gate)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. T001 → T002 (lockfile serialization).
- **Foundational (Phase 2)**: After Setup. T003 blocks the US1 sweep and US2 pipeline.
- **US1 (Phase 3)**: After Foundational. Independently shippable MVP.
- **US2 (Phase 4)**: After Foundational. Independent of US1's rule content.
- **US3 (Phase 5)**: After US1 **and** US2 (it ties activation + enforcement together).
- **Polish (Phase 6)**: After all desired stories.

### User Story Dependencies

- **US1 (P1)**: Needs only Setup + Foundational. No dependency on other stories.
- **US2 (P2)**: Needs only Setup + Foundational. Delivers commit-time formatting whether or
  not US1's rules are present (so independently testable).
- **US3 (P3)**: Builds on US1 (rules at `error` for CI enforcement + normalized repo) and
  US2 (husky `prepare` + pre-commit hook). This cross-story dependency is intentional — US3
  is the "make it uniform + enforced + documented" hardening story.

### Within Each Story

- US1: T004 → T005 (same file `base.js`, sequential) → T006 (sweep needs rules present) → T007 (verify).
- US2: T008 [P] alongside T009; T009 → T010 (T010 edits the file T009 creates) → T011 (verify).
- US3: T012 (docs) independent; T013, T014 are validations after US1+US2.

### Parallel Opportunities

- **Across stories**: After Foundational, US1 and US2 can be built in parallel by different
  developers (US1 = `base.js`; US2 = `.lintstagedrc.mjs` + `.husky/` + `package.json`).
- **Within US2**: T008 (`.lintstagedrc.mjs`) is [P] with T009 (`husky init`).
- Setup tasks are NOT parallel (shared lockfile).

---

## Parallel Example: After Foundational (two developers)

```bash
# Developer A — User Story 1 (the rules):
Task: "T004 Add simple-import-sort to packages/eslint-config/base.js"
Task: "T005 Add unused-imports to packages/eslint-config/base.js"

# Developer B — User Story 2 (the pipeline), in parallel:
Task: "T008 Create root .lintstagedrc.mjs"
Task: "T009 Run pnpm exec husky init"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup (T001–T002) → 2. Phase 2 Foundational (T003) → 3. Phase 3 US1 (T004–T007).
4. **STOP and VALIDATE**: messy file → `eslint --fix` → canonical order + no unused; `pnpm lint` green.
5. Ship: from here, CI (`turbo lint`) already enforces import hygiene even before the commit hook exists.

### Incremental Delivery

1. Setup + Foundational → ready.
2. US1 → import hygiene live + repo normalized → ship (MVP).
3. US2 → auto-fix/format on commit (staged-only) → ship.
4. US3 → uniform activation + bypass + docs + parity checks → ship.

---

## Notes

- [P] = different files, no incomplete dependencies.
- The US1 normalization sweep (T006) is a large, one-time, behavior-preserving diff — review
  it as mechanical churn and commit it on its own for a clean history.
- The `--flag v10_config_lookup_from_file` is required only while on ESLint 9.x; drop it when
  the repo upgrades to ESLint 10 (where per-file config lookup is the default). See
  `research.md` Decision 4.
- Per project memory: commit messages OMIT the `Co-Authored-By` trailer; work in phases and
  get commit-message approval before committing.
