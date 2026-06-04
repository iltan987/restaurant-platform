# Quickstart: Validating Automated Import Hygiene & Pre-Commit Formatting

Runnable scenarios that prove the feature works end-to-end. Run from the repo root after
implementation. (Implementation details live in `tasks.md`; this is a validation guide.)

## Prerequisites

```bash
pnpm install          # runs the `prepare` script → husky installs git hooks
ls .husky/pre-commit  # should exist and contain `pnpm exec lint-staged`
```

## Scenario A — Import ordering + unused removal on commit (US1 / SC-001, SC-002)

1. Pick a tracked source file (e.g. `apps/dashboard/...`). Scramble its import order and
   add one unused import, e.g. `import { useMemo } from "react"` that is never used.
2. `git add <file>` then `git commit -m "test: import hygiene"`.
3. **Expected**: the commit succeeds; the committed file has imports in canonical group
   order (see `contracts/import-ordering-policy.md`) and the unused `useMemo` import is
   gone. Confirm with `git show HEAD:<file>`.
4. Re-running the tool is a no-op:
   ```bash
   pnpm exec eslint --fix --flag v10_config_lookup_from_file <file>
   git diff --quiet <file> && echo "DETERMINISTIC ✓"
   ```

## Scenario B — Prettier + lint-fix, staged-files-only, low overhead (US2 / SC-003)

1. Introduce a Prettier deviation in a staged file (add a semicolon, use single quotes,
   exceed 80 cols, or unsorted Tailwind classes in a `className`).
2. Stage a small changeset (≤10 files) and commit while timing:
   ```bash
   time git commit -m "test: format-on-commit"
   ```
3. **Expected**: committed file conforms to Prettier config; only staged files were
   touched (unstaged files unchanged); perceived overhead ≲ ~2s for the small changeset.

## Scenario C — Blocking on non-auto-fixable errors (US2 / FR-006)

1. Add a non-fixable ESLint error to a staged file (e.g. reference an undefined variable,
   or violate a non-fixable rule).
2. `git add` + `git commit`.
3. **Expected**: the commit is **aborted**; output names the offending file and rule.
   Fix the error (or `git commit --no-verify` to bypass — Scenario E) and re-commit.

## Scenario D — Generated/build code is never processed (FR-009)

1. Touch a generated file under `packages/db/src/generated/**` (or stage one) and commit it
   alongside a normal change.
2. **Expected**: the generated file is not reformatted/reordered; no eslint "ignored file"
   warning is printed (`--no-warn-ignored`); the commit succeeds.

## Scenario E — Emergency bypass (US3 / FR-008)

```bash
git commit --no-verify -m "wip: bypass checks"
```

**Expected**: commit completes without running eslint/prettier.

## Scenario F — Fresh-clone zero-setup activation (US3 / SC-004)

```bash
git clone <repo> /tmp/rp-fresh && cd /tmp/rp-fresh
pnpm install
# make a messy-import commit as in Scenario A
```

**Expected**: commit-time fixing is active with no steps beyond `pnpm install`.

## Scenario G — Local ⇔ CI parity (US3 / FR-010, SC-006)

```bash
pnpm lint     # turbo lint across all workspaces
pnpm format   # prettier check/write across all workspaces
```

**Expected**: after the one-time normalization sweep, both pass clean. A commit that
passed locally does not fail CI for import/format reasons.

## One-time normalization (run once during implementation, before the gates pass)

```bash
# Apply the new rules across the whole repo, then commit the mechanical churn.
pnpm exec eslint . --fix --flag v10_config_lookup_from_file
pnpm exec prettier --write .
```

This is the moment SC-001/SC-005 (no ordering-only churn) begin to hold.
